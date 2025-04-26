/**
 * @name AutoLaTeXImageConverter
 * @description Converts inline math (fractions, exponents, sqrt), variables, parentheses, and Greek letters to LaTeX images via CodeCogs.
 * @version 1.7.0
 * @author dirtymaskz
 */

const config = {
  info: {
    name: "AutoLaTeXImageConverter",
    authors: [{ name: "You", discord_id: "", github_username: "" }],
    version: "1.7.0",
    description:
      "Converts inline math, expressions, Greek letters, and parentheses to LaTeX images via CodeCogs with white text. Skips URLs/GIFs.",
  }
};

module.exports = (() => {
  return !global.ZeresPluginLibrary
    ? class {
        constructor() { this._config = config; }
        getName() { return config.info.name; }
        getDescription() { return config.info.description; }
        getVersion() { return config.info.version; }
        load() {
          BdApi.showConfirmationModal(
            "Library Missing",
            `The library plugin needed for ${config.info.name} is missing. Please install ZeresPluginLibrary.`,
            { confirmText: "OK", cancelText: "Cancel" }
          );
        }
        start() {}
        stop() {}
      }
    : (([Plugin, Api]) => {
        const { Patcher, WebpackModules, Logger } = Api;
        const MessageActions = WebpackModules.getByProps("sendMessage");

        return class AutoLaTeXImageConverter extends Plugin {
          onStart() {
            Logger.log(`🔢 ${config.info.name} v${config.info.version} starting...`);

            if (!MessageActions?.sendMessage) {
              Logger.error("sendMessage not found; aborting.");
              return;
            }

            Patcher.before(
              MessageActions,
              "sendMessage",
              (thisObj, [channelId, message]) => {
                try {
                  let text = message.content;
                  if (!text) return;

                  // Skip any content containing URLs (including GIFs)
                  if (/https?:\/\//i.test(text)) {
                    Logger.debug("Skipping conversion for URL/GIF message.");
                    return;
                  }

                  Logger.debug("Input text for LaTeX conversion:", text);

                  // Convert Greek names to LaTeX commands
                  [
                    "alpha","beta","gamma","delta","epsilon","zeta","eta","theta","iota",
                    "kappa","lambda","mu","nu","xi","omicron","pi","rho","sigma",
                    "tau","upsilon","phi","chi","psi","omega"
                  ].forEach(name => {
                    const regex = new RegExp(`\\b${name}\\b`, "g");
                    text = text.replace(regex, `\\${name}`);
                  });

                  // Fractions: support commands, parentheses, variables
                  let latex = text.replace(
                    /(\\[A-Za-z]+|\([^\)]+\)|[A-Za-z0-9]+)\s*\/\s*(\\[A-Za-z]+|\([^\)]+\)|[A-Za-z0-9]+)/g,
                    "\\frac{$1}{$2}"
                  );
                  // Exponents: support commands and grouping
                  latex = latex.replace(
                    /(\\[A-Za-z]+|\([^\)]+\)|[A-Za-z0-9]+)\^(\\[A-Za-z]+|\([^\)]+\)|[A-Za-z0-9]+)/g,
                    "$1^{ $2 }"
                  );
                  // Square roots
                  latex = latex.replace(
                    /sqrt\(\s*([^)]+)\s*\)/g,
                    "\\sqrt{$1}"
                  );

                  if (latex === message.content) {
                    // No change detected, leave message
                    return;
                  }

                  Logger.info("Converted LaTeX:", latex);

                  // White-colored text for contrast
                  const expr = `\\dpi{200} \\color{white}{${latex}}`;
                  const url =
                    "https://latex.codecogs.com/png.latex?" +
                    encodeURIComponent(expr);

                  Logger.info("Replacing content with LaTeX image URL:", url);

                  // Replace message content with the image URL only
                  message.content = url;
                } catch (err) {
                  Logger.error("AutoLaTeXImageConverter error:", err);
                }
              }
            );
          }

          onStop() {
            Patcher.unpatchAll();
            Logger.log(`🛑 ${config.info.name} stopped.`);
          }
        };
      })(global.ZeresPluginLibrary.buildPlugin(config));
})();
