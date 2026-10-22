var e=`https://github.com/rotorflight/rotorflight-configurator/releases`,t={hasWebSerial(){return`serial`in navigator},hasWebBluetooth(){return`bluetooth`in navigator},hasWebUSB(){return`usb`in navigator},hasWebStorage(){try{let e=`__storage_test__`;return localStorage.setItem(e,e),localStorage.removeItem(e),!0}catch{return!1}},getBrowserName(){let e=navigator.userAgent;return e.includes(`Edg/`)?`Microsoft Edge`:e.includes(`Chrome/`)?`Google Chrome`:e.includes(`Safari/`)&&!e.includes(`Chrome/`)?`Safari`:e.includes(`Firefox/`)?`Mozilla Firefox`:e.includes(`OPR/`)?`Opera`:e.includes(`Brave/`)?`Brave`:`Unknown Browser`},checkAll(){let e=this.hasWebSerial(),t=this.hasWebBluetooth(),n=this.hasWebUSB(),r=this.hasWebStorage();return{hasWebSerial:e,hasWebBluetooth:t,hasWebUSB:n,hasWebStorage:r,browserName:this.getBrowserName(),isCompatible:(e||t||n)&&r}},displayWarning(t){if(t.isCompatible)return!0;let n=[];t.hasWebSerial||n.push(`Web Serial`),t.hasWebBluetooth||n.push(`Web Bluetooth`),t.hasWebUSB||n.push(`WebUSB`);let r=`
⚠️ Unsupported Browser: ${t.browserName}

Rotorflight Configurator Web needs at least one of the following APIs to
talk to a flight controller, and your browser has none of them:
${n.map(e=>`  • ${e}`).join(`
`)}

Please use a Chromium-based browser (Chrome, Edge, Brave, or Opera), or the
desktop app: ${e}
    `.trim();return console.warn(r),!1},injectBanner(t,n=`app`){if(t.isCompatible)return;let r=document.getElementById(n)||document.body,i=document.createElement(`div`);i.id=`browser-compat-banner`,i.setAttribute(`role`,`alert`),i.style.cssText=`
      position: fixed;
      top: 0;
      left: 0;
      right: 0;
      z-index: 100000;
      background-color: #fff3cd;
      border-bottom: 1px solid #ffc107;
      padding: 10px 44px 10px 16px;
      color: #856404;
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
      font-size: 14px;
      line-height: 1.5;
    `;let a=[];t.hasWebSerial||a.push(`Web Serial`),t.hasWebBluetooth||a.push(`Web Bluetooth`),t.hasWebUSB||a.push(`WebUSB`),i.innerHTML=`⚠️ <strong>Unsupported Browser</strong><br/>Your browser (${t.browserName}) doesn't support ${a.join(`, `)}. Device communication needs at least one of Web Serial, Web Bluetooth, or WebUSB. Please use a Chromium-based browser (Chrome, Edge, Brave, or Opera), or <a href="${e}" target="_blank" rel="noopener">download the desktop app</a>.`;let o=document.createElement(`button`);o.type=`button`,o.setAttribute(`aria-label`,`Dismiss`),o.textContent=`×`,o.style.cssText=`
      position: absolute;
      top: 6px;
      right: 10px;
      border: 0;
      background: none;
      color: inherit;
      font-size: 22px;
      line-height: 1;
      cursor: pointer;
    `,o.addEventListener(`click`,()=>i.remove()),i.appendChild(o),r.insertBefore(i,r.firstChild)}};function n(e={}){let{showBanner:n=!0,containerId:r=`app`,onIncompatible:i=null}=e;if(typeof window>`u`)return null;let a=t.checkAll();return t.displayWarning(a),n&&!a.isCompatible&&(document.readyState===`loading`?document.addEventListener(`DOMContentLoaded`,()=>{t.injectBanner(a,r)}):t.injectBanner(a,r)),!a.isCompatible&&typeof i==`function`&&i(a),a}export{n as initBrowserCompat};