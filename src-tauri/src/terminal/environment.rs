use std::collections::HashMap;
use std::env;
use std::fs;
use std::path::{Path, PathBuf};
use dirs;

#[derive(Debug, Clone)]
pub struct EnvironmentInfo {
    pub shell: String,
    pub path_dirs: Vec<String>,
    pub env_vars: HashMap<String, String>,
    pub dev_tools: HashMap<String, String>,
}

impl EnvironmentInfo {
    pub fn detect() -> Self {
        let mut env_info = EnvironmentInfo {
            shell: detect_shell(),
            path_dirs: Vec::new(),
            env_vars: HashMap::new(),
            dev_tools: HashMap::new(),
        };

        // Start with system PATH
        if let Ok(system_path) = env::var("PATH") {
            env_info.path_dirs.extend(system_path.split(':').map(String::from));
        }

        // Copy current environment variables first (base environment)
        for (key, value) in env::vars() {
            env_info.env_vars.insert(key, value);
        }

        // Add common development paths
        env_info.add_common_dev_paths();

        // Load shell configuration and enhance environment
        env_info.load_shell_config();
        env_info.load_shell_environment();

        // Debug: Show KIMI-related variables before resolution
        env_info.debug_kimi_variables("Before resolution");

        // Resolve all variable references in collected environment
        env_info.resolve_all_variables();

        // Debug: Show KIMI-related variables after resolution
        env_info.debug_kimi_variables("After resolution");

        // Detect development tools
        env_info.discover_dev_tools();

        // Ensure critical authentication variables are preserved and resolved
        env_info.preserve_authentication_vars();

        // Update PATH in env vars
        env_info.env_vars.insert("PATH".to_string(), env_info.path_dirs.join(":"));

        env_info
    }

    fn add_common_dev_paths(&mut self) {
        let home_dir = dirs::home_dir().unwrap_or_default();
        
        // Create owned strings for dynamic paths
        let home_str = home_dir.to_string_lossy();
        let npm_bin = format!("{}/.npm/bin", home_str);
        let node_modules_bin = format!("{}/node_modules/.bin", home_str);
        let pnpm_bin = format!("{}/.local/share/pnpm", home_str);
        let yarn_bin = format!("{}/.yarn/bin", home_str);
        let bun_bin = format!("{}/.bun/bin", home_str);
        let cargo_bin = format!("{}/.cargo/bin", home_str);
        let go_bin = format!("{}/go/bin", home_str);
        let local_bin = format!("{}/.local/bin", home_str);
        
        // Common development tool paths
        let dev_paths = vec![
            // Homebrew (Apple Silicon)
            "/opt/homebrew/bin",
            "/opt/homebrew/sbin",
            // Homebrew (Intel)
            "/usr/local/bin",
            "/usr/local/sbin",
            // npm global
            npm_bin.as_str(),
            node_modules_bin.as_str(),
            // pnpm
            pnpm_bin.as_str(),
            // Yarn global
            yarn_bin.as_str(),
            // Bun
            bun_bin.as_str(),
            // Cargo
            cargo_bin.as_str(),
            // Go
            go_bin.as_str(),
            // Python user base
            local_bin.as_str(),
            // macOS system paths
            "/usr/bin",
            "/bin",
            "/usr/sbin",
            "/sbin",
        ];

        for path in dev_paths {
            if Path::new(path).exists() && !self.path_dirs.contains(&path.to_string()) {
                self.path_dirs.push(path.to_string());
            }
        }
    }

    fn load_shell_config(&mut self) {
        let home_dir = dirs::home_dir().unwrap_or_default();
        
        let config_files = match self.shell.as_str() {
            "zsh" => vec![".zshrc", ".zprofile", ".zshenv"],
            "bash" => vec![".bashrc", ".bash_profile", ".profile"],
            "fish" => vec![".config/fish/config.fish"],
            _ => vec![".profile"],
        };

        for config_file in config_files {
            let config_path = home_dir.join(config_file);
            if let Ok(content) = fs::read_to_string(&config_path) {
                self.parse_shell_config(&content);
            }
        }
    }

    fn load_shell_environment(&mut self) {
        // Try to get full environment by running the user's shell with profile loading
        let shell_command = match self.shell.as_str() {
            "zsh" => vec!["zsh", "-l", "-c", "env"],
            "bash" => vec!["bash", "--login", "-c", "env"],
            "fish" => vec!["fish", "-l", "-c", "env"],
            _ => vec!["sh", "-l", "-c", "env"],
        };

        if let Ok(output) = std::process::Command::new(shell_command[0])
            .args(&shell_command[1..])
            .output()
        {
            if output.status.success() {
                let env_output = String::from_utf8_lossy(&output.stdout);
                self.parse_env_output(&env_output);
            }
        }
    }

    fn parse_env_output(&mut self, output: &str) {
        for line in output.lines() {
            let line = line.trim();
            if let Some(equals_pos) = line.find('=') {
                let key = &line[..equals_pos];
                let value = &line[equals_pos + 1..];
                
                // Only override if it's an authentication/development related variable
                // or if we don't already have it
                if self.is_important_env_var(key) || !self.env_vars.contains_key(key) {
                    // Don't resolve here - we'll do it in a separate pass
                    self.env_vars.insert(key.to_string(), value.to_string());
                }
            }
        }
    }

    fn resolve_all_variables(&mut self) {
        println!("🔧 Starting global variable resolution...");
        
        // Perform multiple passes of variable resolution until no more changes
        let mut max_passes = 10; // Prevent infinite loops
        let mut changed = true;
        let mut pass_count = 0;
        
        while changed && max_passes > 0 {
            changed = false;
            max_passes -= 1;
            pass_count += 1;
            
            println!("🔧 Variable resolution pass {}", pass_count);
            
            // Collect keys to avoid borrowing issues
            let keys: Vec<String> = self.env_vars.keys().cloned().collect();
            
            for key in keys {
                if let Some(value) = self.env_vars.get(&key).cloned() {
                    if value.contains('$') {
                        println!("🔧   Resolving {}: {} -> ", key, value);
                        let resolved_value = self.resolve_variable_references(&value);
                        if resolved_value != value {
                            println!("🔧   {} -> {}", value, resolved_value);
                            self.env_vars.insert(key, resolved_value);
                            changed = true;
                        } else {
                            println!("🔧   No change: {}", value);
                        }
                    }
                }
            }
        }
        
        println!("🔧 Variable resolution completed after {} passes", pass_count);
    }

    fn resolve_variable_references(&self, value: &str) -> String {
        let mut result = value.to_string();
        println!("🔧     Resolving variable references in: '{}'", value);
        
        // Handle ${VAR} pattern first
        while let Some(start) = result.find("${") {
            if let Some(end) = result[start..].find('}') {
                let var_name = &result[start + 2..start + end];
                let full_pattern = &result[start..start + end + 1];
                
                println!("🔧     Found ${{{}}}, looking for value...", var_name);
                
                if let Some(replacement) = self.env_vars.get(var_name) {
                    println!("🔧     Found value for {}: '{}'", var_name, replacement);
                    result = result.replace(full_pattern, replacement);
                } else {
                    println!("🔧     No value found for {}", var_name);
                    // If we can't resolve it, leave it as is and break to avoid infinite loop
                    break;
                }
            } else {
                break;
            }
        }
        
        // Handle $VAR pattern (simple variable references)
        let mut start_pos = 0;
        while let Some(start) = result[start_pos..].find('$') {
            let absolute_start = start_pos + start;
            let remaining = &result[absolute_start + 1..];
            
            // Find the end of the variable name
            let var_end = remaining.find(|c: char| !c.is_alphanumeric() && c != '_')
                .unwrap_or(remaining.len());
            
            if var_end > 0 {
                let var_name = &remaining[..var_end];
                
                // Only replace if it looks like a valid variable name
                if var_name.chars().all(|c| c.is_alphanumeric() || c == '_') 
                    && var_name.chars().next().map_or(false, |c| c.is_alphabetic() || c == '_') {
                    
                    println!("🔧     Found ${}, looking for value...", var_name);
                    
                    if let Some(replacement) = self.env_vars.get(var_name) {
                        println!("🔧     Found value for {}: '{}'", var_name, replacement);
                        let full_pattern = &result[absolute_start..absolute_start + 1 + var_end];
                        result = result.replace(full_pattern, replacement);
                        // Start search from beginning since we modified the string
                        start_pos = 0;
                        continue;
                    } else {
                        println!("🔧     No value found for {}", var_name);
                    }
                }
            }
            
            // Move past this $ to continue searching
            start_pos = absolute_start + 1;
            if start_pos >= result.len() {
                break;
            }
        }
        
        println!("🔧     Final result: '{}'", result);
        result
    }

    fn is_important_env_var(&self, key: &str) -> bool {
        // Prioritize authentication and development environment variables
        let important_prefixes = vec![
            "ANTHROPIC_", "CLAUDE_", "SSH_", "GIT_", "GITHUB_",
            "OPENAI_", "GOOGLE_", "AWS_", "AZURE_", "DOCKER_",
            "NODE_", "NPM_", "YARN_", "PNPM_", "BUN_",
            "PYTHON_", "PIP_", "CARGO_", "RUST_", "GO_"
        ];
        
        let important_suffixes = vec![
            "_API_KEY", "_TOKEN", "_SECRET", "_AUTH", "_CREDENTIALS"
        ];
        
        let exact_matches = vec![
            "EDITOR", "VISUAL", "BROWSER", "TERM", "SHELL",
            "LANG", "LC_ALL", "HOME", "USER", "LOGNAME"
        ];
        
        for prefix in &important_prefixes {
            if key.starts_with(prefix) {
                return true;
            }
        }
        
        for suffix in &important_suffixes {
            if key.ends_with(suffix) {
                return true;
            }
        }
        
        exact_matches.contains(&key)
    }

    fn preserve_authentication_vars(&mut self) {
        println!("🔐 Preserving authentication variables...");
        
        // Ensure Claude Code specific variables are preserved from current environment
        let claude_vars = vec![
            "CLAUDE_CODE_SSE_PORT", "CLAUDE_CODE_ENTRYPOINT", "CLAUDECODE",
            "ANTHROPIC_BASE_URL", "ANTHROPIC_AUTH_TOKEN", "ANTHROPIC_API_KEY"
        ];
        
        for var in claude_vars {
            if let Ok(value) = env::var(var) {
                println!("🔐   Found {} in current env: '{}'", var, value);
                // Resolve any variable references in the current environment value
                let resolved_value = self.resolve_variable_references(&value);
                println!("🔐   After resolution: '{}'", resolved_value);
                self.env_vars.insert(var.to_string(), resolved_value);
            } else {
                println!("🔐   {} not found in current environment", var);
            }
        }
        
        // Also preserve SSH agent and other common auth variables
        let auth_vars = vec!["SSH_AUTH_SOCK", "SSH_AGENT_PID", "GPG_AGENT_INFO"];
        for var in auth_vars {
            if let Ok(value) = env::var(var) {
                println!("🔐   Found {} in current env: '{}'", var, value);
                self.env_vars.insert(var.to_string(), value);
            }
        }
        
        // Perform one final resolution pass on authentication variables specifically
        self.resolve_authentication_variables();
    }
    
    fn resolve_authentication_variables(&mut self) {
        println!("🔐 Final authentication variable resolution...");
        
        let auth_keys = vec![
            "ANTHROPIC_AUTH_TOKEN", "ANTHROPIC_API_KEY", "ANTHROPIC_BASE_URL",
            "CLAUDE_CODE_SSE_PORT", "CLAUDE_CODE_ENTRYPOINT", "CLAUDECODE"
        ];
        
        for key in auth_keys {
            if let Some(value) = self.env_vars.get(key).cloned() {
                println!("🔐   Final check for {}: '{}'", key, value);
                let resolved_value = self.resolve_variable_references(&value);
                if resolved_value != value {
                    println!("🔐   Updated {} from '{}' to '{}'", key, value, resolved_value);
                    self.env_vars.insert(key.to_string(), resolved_value);
                } else {
                    println!("🔐   No change needed for {}", key);
                }
            } else {
                println!("🔐   {} not found in env_vars", key);
            }
        }
    }

    fn debug_kimi_variables(&self, phase: &str) {
        println!("🐛 Debug KIMI variables ({})", phase);
        for (key, value) in &self.env_vars {
            if key.contains("KIMI") || key.contains("ANTHROPIC") || value.contains("KIMI") {
                println!("🐛   {}: '{}'", key, value);
            }
        }
    }

    fn parse_shell_config(&mut self, content: &str) {
        for line in content.lines() {
            let line = line.trim();
            
            // Skip comments and empty lines
            if line.starts_with('#') || line.is_empty() {
                continue;
            }

            // Look for PATH exports
            if line.starts_with("export PATH=") || line.starts_with("PATH=") {
                self.parse_path_export(line);
            }
            
            // Look for other environment variable exports
            if line.starts_with("export ") {
                self.parse_env_export(line);
            }
        }
    }

    fn parse_path_export(&mut self, line: &str) {
        // Handle patterns like: export PATH="/some/path:$PATH"
        if let Some(equals_pos) = line.find('=') {
            let value_part = &line[equals_pos + 1..];
            let value_part = value_part.trim_matches('"').trim_matches('\'');
            
            // Split by colons and process each path
            for path in value_part.split(':') {
                let path = path.trim();
                if path == "$PATH" || path == "${PATH}" {
                    continue; // Skip PATH variable references
                }
                
                // Expand ~ to home directory
                let expanded_path = if path.starts_with('~') {
                    if let Some(home) = dirs::home_dir() {
                        path.replace('~', &home.to_string_lossy())
                    } else {
                        continue;
                    }
                } else {
                    path.to_string()
                };

                if Path::new(&expanded_path).exists() && !self.path_dirs.contains(&expanded_path) {
                    self.path_dirs.push(expanded_path);
                }
            }
        }
    }

    fn parse_env_export(&mut self, line: &str) {
        // Handle patterns like: export VAR="value"
        if let Some(export_start) = line.find("export ") {
            let var_part = &line[export_start + 7..];
            if let Some(equals_pos) = var_part.find('=') {
                let var_name = var_part[..equals_pos].trim();
                let var_value = var_part[equals_pos + 1..].trim_matches('"').trim_matches('\'');
                
                if var_name != "PATH" {
                    self.env_vars.insert(var_name.to_string(), var_value.to_string());
                }
            }
        }
    }

    fn discover_dev_tools(&mut self) {
        let tools_to_find = vec![
            ("node", vec!["node"]),
            ("npm", vec!["npm"]),
            ("yarn", vec!["yarn"]),
            ("pnpm", vec!["pnpm"]),
            ("bun", vec!["bun"]),
            ("cargo", vec!["cargo"]),
            ("git", vec!["git"]),
            ("python", vec!["python3", "python"]),
            ("pip", vec!["pip3", "pip"]),
        ];

        for (tool_name, commands) in tools_to_find {
            for command in commands {
                if let Some(path) = self.find_executable(command) {
                    self.dev_tools.insert(tool_name.to_string(), path);
                    break;
                }
            }
        }
    }

    fn find_executable(&self, name: &str) -> Option<String> {
        for dir in &self.path_dirs {
            let executable_path = PathBuf::from(dir).join(name);
            if executable_path.is_file() {
                // Check if file is executable (Unix permissions)
                if let Ok(metadata) = fs::metadata(&executable_path) {
                    use std::os::unix::fs::PermissionsExt;
                    if metadata.permissions().mode() & 0o111 != 0 {
                        return Some(executable_path.to_string_lossy().to_string());
                    }
                }
            }
        }
        None
    }

    pub fn get_env_for_spawn(&self) -> HashMap<String, String> {
        self.env_vars.clone()
    }

    pub fn get_path(&self) -> String {
        self.path_dirs.join(":")
    }
}

fn detect_shell() -> String {
    // Try to detect user's shell
    if let Ok(shell) = env::var("SHELL") {
        if let Some(shell_name) = Path::new(&shell).file_name() {
            return shell_name.to_string_lossy().to_string();
        }
    }
    
    // Default fallback
    "zsh".to_string()
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_environment_detection() {
        let env_info = EnvironmentInfo::detect();
        
        // Should have some PATH directories
        assert!(!env_info.path_dirs.is_empty());
        
        // Should detect shell
        assert!(!env_info.shell.is_empty());
        
        println!("Detected shell: {}", env_info.shell);
        println!("PATH directories: {:?}", env_info.path_dirs);
        println!("Dev tools found: {:?}", env_info.dev_tools);
    }
}