const { withDangerousMod } = require("@expo/config-plugins");
const fs = require("node:fs");
const path = require("node:path");

const withFmtFix = (config) => {
  return withDangerousMod(config, [
    "ios",
    async (config) => {
      const podfilePath = path.join(config.modRequest.platformProjectRoot, "Podfile");

      if (!fs.existsSync(podfilePath)) {
        return config;
      }

      let content = fs.readFileSync(podfilePath, "utf8");

      if (content.includes("fmt_base = File.join(installer.sandbox.pod_dir('fmt')")) {
        return config;
      }

      const patchCode = `
    # Fix fmt consteval compilation error with newer Xcode
    fmt_base = File.join(installer.sandbox.pod_dir('fmt'), 'include', 'fmt', 'base.h')
    if File.exist?(fmt_base)
      content = File.read(fmt_base)
      patched = content.gsub(/^#\\s*define FMT_USE_CONSTEVAL 1$/, '# define FMT_USE_CONSTEVAL 0')
      if patched != content
        File.chmod(0644, fmt_base)
        File.write(fmt_base, patched)
      end
    end`;

      const marker = /react_native_post_install\([^\)]*\)([\s\S]*?)end/;

      if (marker.test(content)) {
        content = content.replace(marker, (match) => {
          return match.replace(/\nend$/, `\n${patchCode}\nend`);
        });
        fs.writeFileSync(podfilePath, content);
      }

      return config;
    },
  ]);
};

module.exports = withFmtFix;
