/**
 * @name         AutoLaTeXImageConverter
 * @description  Automatically converts inline math (fractions, exponents, sqrt) and Greek-letter names to LaTeX images via CodeCogs
 * @version      1.0.1
 * @author       dirtymaskz
 * @source       https://github.com/Dirtymaskz/AutoLaTeXImageConverter
 */

const PLUGIN_NAME    = "AutoLaTeXImageConverter";
const PLUGIN_VERSION = "1.0.1";

/* default settings */
const defaults = {
  convertFractions: true,
  convertExponents: true,
  convertSqrt:      true,

  convertAlpha:  true, convertBeta:  true, convertGamma: true,
  convertDelta:  true, convertLambda:true, convertMu:    true,
  convertNu:     true, convertOmega: true, convertPi:    true,
  convertSigma:  true, convertTheta: true
};

/* setting-id ➜ LaTeX command */
const greekMap = {
  convertAlpha:"alpha",  convertBeta:"beta",   convertGamma:"gamma",
  convertDelta:"delta",  convertLambda:"lambda", convertMu:"mu",
  convertNu:"nu",        convertOmega:"omega", convertPi:"pi",
  convertSigma:"sigma",  convertTheta:"theta"
};

module.exports = class AutoLaTeXImageConverter {
  /*───────────────────────── metadata ─────────────────────────*/
  getName()        { return PLUGIN_NAME; }
  getVersion()     { return PLUGIN_VERSION; }
  getDescription() { return "Automatically converts inline math snippets to LaTeX images (fractions, exponents, sqrt, Greek letters)."; }
  getAuthor()      { return "dirtymaskz"; }

  /*───────────────────────── lifecycle ─────────────────────────*/
  start() {
    this.settings = BdApi.Data.load(PLUGIN_NAME, "settings") || { ...defaults };

    const MessageActions = BdApi.Webpack.getModule(m => m?.sendMessage);
    if (!MessageActions?.sendMessage) {
      BdApi.Logger.error(PLUGIN_NAME, "sendMessage not found; aborting.");
      return;
    }

    /* patch sendMessage */
    this.cancelPatch = BdApi.Patcher.before(
      PLUGIN_NAME,
      MessageActions,
      "sendMessage",
      (_t, [_, msg]) => this._processMessage(msg)
    );
  }

  stop() {
    BdApi.Patcher.unpatchAll(PLUGIN_NAME);
  }

  /*───────────────────────── message logic ─────────────────────────*/
  _processMessage(message) {
    let txt = message.content;
    if (!txt || /https?:\/\//i.test(txt)) return;   // skip links / gifs

    /* Greek words */
    for (const [sid, cmd] of Object.entries(greekMap)) {
      if (!this.settings[sid]) continue;
      const re = new RegExp(`(?<!\\\\)(?<![A-Za-z])${cmd}(?![A-Za-z])`, "gi");
      txt = txt.replace(re, `\\${cmd}`);
    }

    /* Fractions */
    if (this.settings.convertFractions) {
      txt = txt.replace(
        /(\\[A-Za-z]+|\([^)]+\)|[A-Za-z0-9]+)\s*\/\s*(\\[A-Za-z]+|\([^)]+\)|[A-Za-z0-9]+)/g,
        "\\frac{$1}{$2}"
      );
    }

    /* Exponents */
    if (this.settings.convertExponents) {
      txt = txt.replace(
        /(\\[A-Za-z]+|\([^)]+\)|[A-Za-z0-9]+)\^(\s*\\?[A-Za-z0-9\(\\{]+)/g,
        "$1^{ $2 }"
      );
    }

    /* Square roots */
    if (this.settings.convertSqrt) {
      txt = txt.replace(/sqrt\(\s*([^)]+?)\s*\)/g, "\\sqrt{$1}");
    }

    if (txt === message.content) return;

    const url =
      "https://latex.codecogs.com/png.latex?" +
      encodeURIComponent(`\\dpi{200} \\color{white}{${txt}}`);

    message.content = url;
  }

  /*───────────────────────── settings UI ─────────────────────────*/
  getSettingsPanel() {
    return BdApi.UI.buildSettingsPanel({
      settings: [
        { id:"convertFractions", type:"switch", name:"Convert Fractions",       value:this.settings.convertFractions },
        { id:"convertExponents", type:"switch", name:"Convert Exponents",       value:this.settings.convertExponents },
        { id:"convertSqrt",      type:"switch", name:"Convert Square Roots",    value:this.settings.convertSqrt },
        {
          type:"category",
          id:"greekLetters",
          name:"Greek Letters",
          collapsible:true,
          shown:false,
          settings: Object.entries(greekMap).map(([sid, cmd]) => ({
            id:sid, type:"switch", name:cmd, value:this.settings[sid]
          }))
        }
      ],
      onChange: (_grp, id, val) => {
        this.settings[id] = val;
        BdApi.Data.save(PLUGIN_NAME, "settings", this.settings);
      }
    });
  }
};
