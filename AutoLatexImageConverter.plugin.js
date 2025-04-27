/**
 * @name         AutoLaTeXImageConverter
 * @description  Automatically converts inline math (fractions, exponents, sqrt) and Greek-letter names to LaTeX images via CodeCogs
 * @version      1.0.2
 * @author       dirtymaskz
 * @source       https://github.com/Dirtymaskz/AutoLaTeXImageConverter
 */

const PLUGIN_CFG = {
  info: {
    name:        "AutoLaTeXImageConverter",
    version:     "1.0.2",
    description: "Converts inline math to LaTeX images (fractions, exponents, sqrt, Greek letters). All rules can be toggled.",
    authors:     [{ name: "dirtymaskz" }]
  }
};

/* default settings */
const defaults = {
  convertFractions: true,
  convertExponents: true,
  convertSqrt:      true,

  convertAlpha:true, convertBeta:true,  convertGamma:true,
  convertDelta:true, convertLambda:true,convertMu:true,
  convertNu:true,    convertOmega:true, convertPi:true,
  convertSigma:true, convertTheta:true
};

/* id → LaTeX command */
const greekMap = {
  convertAlpha:"alpha",  convertBeta:"beta",   convertGamma:"gamma",
  convertDelta:"delta",  convertLambda:"lambda", convertMu:"mu",
  convertNu:"nu",        convertOmega:"omega", convertPi:"pi",
  convertSigma:"sigma",  convertTheta:"theta"
};

module.exports = class {
  getName()        { return PLUGIN_CFG.info.name; }
  getVersion()     { return PLUGIN_CFG.info.version; }
  getDescription() { return PLUGIN_CFG.info.description; }
  getAuthor()      { return "dirtymaskz"; }

  /*────────────────── lifecycle ──────────────────*/
  start() {
    this.settings = BdApi.Data.load(PLUGIN_CFG.info.name, "settings") || { ...defaults };

    const MessageActions = BdApi.Webpack.getModule(m => m?.sendMessage);
    if (!MessageActions?.sendMessage) {
      BdApi.Logger.error(PLUGIN_CFG.info.name, "sendMessage not found; aborting.");
      return;
    }

    BdApi.Patcher.before(
      PLUGIN_CFG.info.name,
      MessageActions,
      "sendMessage",
      (_t, [_, msg]) => this.process(msg)
    );
  }

  stop() {
    BdApi.Patcher.unpatchAll(PLUGIN_CFG.info.name);
  }

  /*────────────────── conversion ──────────────────*/
  process(message) {
    let txt = message.content;
    if (!txt || /https?:\/\//i.test(txt)) return;               // leave links

    /* 1) Greek keywords */
    for (const [sid, cmd] of Object.entries(greekMap)) {
      if (!this.settings[sid]) continue;
      const re = new RegExp(`(?<!\\\\)(?<![A-Za-z])${cmd}(?![A-Za-z])`, "gi");
      txt = txt.replace(re, `\\${cmd}`);
    }

    /* 2) Fractions  – now recognises sqrt(...) as a single unit */
    if (this.settings.convertFractions) {
      const term = "(sqrt\\([^)]*\\)|\\\\[A-Za-z]+|\\([^)]*\\)|[A-Za-z0-9]+)";
      const fracRE = new RegExp(`${term}\\s*\\/\\s*${term}`, "g");
      txt = txt.replace(fracRE, "\\frac{$1}{$2}");
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

    if (txt === message.content) return;                        // nothing changed

    message.content =
      "https://latex.codecogs.com/png.latex?" +
      encodeURIComponent(`\\dpi{200} \\color{white}{${txt}}`);
  }

  /*────────────────── settings UI ──────────────────*/
  getSettingsPanel() {
    return BdApi.UI.buildSettingsPanel({
      settings: [
        { id:"convertFractions", type:"switch", name:"Convert Fractions",    value:this.settings.convertFractions },
        { id:"convertExponents", type:"switch", name:"Convert Exponents",    value:this.settings.convertExponents },
        { id:"convertSqrt",      type:"switch", name:"Convert Square Roots", value:this.settings.convertSqrt },
        {
          type:"category",
          id:"greekLetters",
          name:"Greek Letters",
          collapsible:true,
          shown:false,
          settings:Object.entries(greekMap).map(([sid, cmd])=>({
            id:sid, type:"switch", name:cmd, value:this.settings[sid]
          }))
        }
      ],
      onChange: (_g, id, val) =>{
        this.settings[id] = val;
        BdApi.Data.save(PLUGIN_CFG.info.name,"settings",this.settings);
      }
    });
  }
};
