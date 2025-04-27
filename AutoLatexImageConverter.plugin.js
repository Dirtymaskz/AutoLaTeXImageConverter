/**
 * @name         AutoLaTeXImageConverter
 * @description  Automatically converts inline math (fractions, exponents, sqrt) and Greek-letter names to LaTeX images via CodeCogs
 * @version      1.0.1
 * @author       dirtymaskz
 * @source       https://github.com/Dirtymaskz/AutoLaTeXImageConverter
 */

const PLUGIN_CFG = {
  info: {
    name:        "AutoLaTeXImageConverter",
    version:     "1.0.1",
    description:
      "Automatically converts inline math (fractions, exponents, sqrt) and Greek-letter names to LaTeX images via CodeCogs",
    authors: [{ name: "dirtymaskz", discord_id: "dirtymaskz", github_username: "Dirtymaskz" }]
  }
};

/*──────────────────────── bootstrap ────────────────────────*/
module.exports = !global.ZeresPluginLibrary
  ? class {
      constructor() { this._config = PLUGIN_CFG; }
      getName()        { return PLUGIN_CFG.info.name; }
      getDescription() { return PLUGIN_CFG.info.description; }
      getVersion()     { return PLUGIN_CFG.info.version; }
      load() {
        BdApi.showConfirmationModal(
          "Library Missing",
          `The library plugin needed for ${PLUGIN_CFG.info.name} is missing.\nPlease install ZeresPluginLibrary from the BetterDiscord plugin list.`,
          { confirmText: "OK" }
        );
      }
      start() {}
      stop() {}
    }
  : (([Plugin, Api]) => {
      const { Patcher, WebpackModules, Logger, PluginUtilities } = Api;

      /* default settings */
      const defaults = {
        convertFractions: true,
        convertExponents: true,
        convertSqrt:      true,

        convertAlpha:  true,
        convertBeta:   true,
        convertGamma:  true,
        convertDelta:  true,
        convertLambda: true,
        convertMu:     true,
        convertNu:     true,
        convertOmega:  true,
        convertPi:     true,
        convertSigma:  true,
        convertTheta:  true
      };

      /* setting-id ⟶ LaTeX command */
      const greekMap = {
        convertAlpha:  "alpha",
        convertBeta:   "beta",
        convertGamma:  "gamma",
        convertDelta:  "delta",
        convertLambda: "lambda",
        convertMu:     "mu",
        convertNu:     "nu",
        convertOmega:  "omega",
        convertPi:     "pi",
        convertSigma:  "sigma",
        convertTheta:  "theta"
      };

      return class AutoLaTeXImageConverter extends Plugin {
        /*──────── lifecycle ────────*/
        onStart() {
          this.settings = PluginUtilities.loadSettings(
            PLUGIN_CFG.info.name,
            defaults
          );

          Logger.log(`${PLUGIN_CFG.info.name} v${PLUGIN_CFG.info.version} starting…`);

          const MsgActions = WebpackModules.getByProps("sendMessage");
          if (!MsgActions?.sendMessage) {
            Logger.error("sendMessage not found; aborting.");
            return;
          }

          Patcher.before(
            MsgActions,
            "sendMessage",
            (_this, [_, msg]) => this._process(msg)
          );
        }

        onStop() {
          Patcher.unpatchAll();
          Logger.log(`${PLUGIN_CFG.info.name} stopped.`);
        }

        /*──────── message conversion ────────*/
        _process(message) {
          let txt = message.content;
          if (!txt || /https?:\/\//i.test(txt)) return;   // leave links/GIFs

          /* 1) Greek keywords */
          for (const [sid, cmd] of Object.entries(greekMap)) {
            if (!this.settings[sid]) continue;
            const re = new RegExp(`(?<!\\\\)(?<![A-Za-z])${cmd}(?![A-Za-z])`, "gi");
            txt = txt.replace(re, `\\${cmd}`);
          }

          /* 2) Fractions */
          if (this.settings.convertFractions) {
            txt = txt.replace(
              /(\\[A-Za-z]+|\([^)]+\)|[A-Za-z0-9]+)\s*\/\s*(\\[A-Za-z]+|\([^)]+\)|[A-Za-z0-9]+)/g,
              "\\frac{$1}{$2}"
            );
          }

          /* 3) Exponents */
          if (this.settings.convertExponents) {
            txt = txt.replace(
              /(\\[A-Za-z]+|\([^)]+\)|[A-Za-z0-9]+)\^(\s*\\?[A-Za-z0-9\(\\{]+)/g,
              "$1^{ $2 }"
            );
          }

          /* 4) Square roots */
          if (this.settings.convertSqrt) {
            txt = txt.replace(/sqrt\(\s*([^)]+?)\s*\)/g, "\\sqrt{$1}");
          }

          if (txt === message.content) return;  // nothing changed

          const url = "https://latex.codecogs.com/png.latex?" +
                      encodeURIComponent(`\\dpi{200} \\color{white}{${txt}}`);

          message.content = url;
        }

        /*──────── settings UI ────────*/
        getSettingsPanel() {
          return BdApi.UI.buildSettingsPanel({
            settings: [
              { id:"convertFractions", type:"switch", name:"Convert Fractions",  value:this.settings.convertFractions },
              { id:"convertExponents", type:"switch", name:"Convert Exponents",  value:this.settings.convertExponents },
              { id:"convertSqrt",      type:"switch", name:"Convert Square Roots", value:this.settings.convertSqrt },

              {
                type:"category",
                id:"greekLetters",
                name:"Greek Letters",
                collapsible:true,
                shown:false,
                settings: Object.entries(greekMap).map(([sid, cmd]) => ({
                  id:sid,
                  type:"switch",
                  name:cmd,
                  value:this.settings[sid]
                }))
              }
            ],
            onChange: (_grp, id, val) => {
              this.settings[id] = val;
              PluginUtilities.saveSettings(PLUGIN_CFG.info.name, this.settings);
            }
          });
        }
      };
    })(global.ZeresPluginLibrary.buildPlugin(PLUGIN_CFG));
