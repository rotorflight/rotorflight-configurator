const a="https://github.com/rotorflight/rotorflight-configurator/releases",i={hasWebSerial(){return"serial"in navigator},hasWebBluetooth(){return"bluetooth"in navigator},hasWebUSB(){return"usb"in navigator},hasWebStorage(){try{const e="__storage_test__";return localStorage.setItem(e,e),localStorage.removeItem(e),!0}catch{return!1}},getBrowserName(){const e=navigator.userAgent;return e.includes("Edg/")?"Microsoft Edge":e.includes("Chrome/")?"Google Chrome":e.includes("Safari/")&&!e.includes("Chrome/")?"Safari":e.includes("Firefox/")?"Mozilla Firefox":e.includes("OPR/")?"Opera":e.includes("Brave/")?"Brave":"Unknown Browser"},checkAll(){const e=this.hasWebSerial(),r=this.hasWebBluetooth(),n=this.hasWebUSB(),t=this.hasWebStorage();return{hasWebSerial:e,hasWebBluetooth:r,hasWebUSB:n,hasWebStorage:t,browserName:this.getBrowserName(),isCompatible:(e||r||n)&&t}},displayWarning(e){if(e.isCompatible)return!0;const r=[];e.hasWebSerial||r.push("Web Serial"),e.hasWebBluetooth||r.push("Web Bluetooth"),e.hasWebUSB||r.push("WebUSB");const n=`
⚠️ Unsupported Browser: ${e.browserName}

Rotorflight Configurator Web needs at least one of the following APIs to
talk to a flight controller, and your browser has none of them:
${r.map(t=>`  • ${t}`).join(`
`)}

Please use a Chromium-based browser (Chrome, Edge, Brave, or Opera), or the
desktop app: ${a}
    `.trim();return console.warn(n),!1},injectBanner(e,r="app"){if(e.isCompatible)return;const n=document.getElementById(r)||document.body,t=document.createElement("div");t.id="browser-compat-banner",t.setAttribute("role","alert"),t.style.cssText=`
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
    `;const o=[];e.hasWebSerial||o.push("Web Serial"),e.hasWebBluetooth||o.push("Web Bluetooth"),e.hasWebUSB||o.push("WebUSB"),t.innerHTML=`⚠️ <strong>Unsupported Browser</strong><br/>Your browser (${e.browserName}) doesn't support ${o.join(", ")}. Device communication needs at least one of Web Serial, Web Bluetooth, or WebUSB. Please use a Chromium-based browser (Chrome, Edge, Brave, or Opera), or <a href="${a}" target="_blank" rel="noopener">download the desktop app</a>.`;const s=document.createElement("button");s.type="button",s.setAttribute("aria-label","Dismiss"),s.textContent="×",s.style.cssText=`
      position: absolute;
      top: 6px;
      right: 10px;
      border: 0;
      background: none;
      color: inherit;
      font-size: 22px;
      line-height: 1;
      cursor: pointer;
    `,s.addEventListener("click",()=>t.remove()),t.appendChild(s),n.insertBefore(t,n.firstChild)}};function l(e={}){const{showBanner:r=!0,containerId:n="app",onIncompatible:t=null}=e;if(typeof window>"u")return null;const o=i.checkAll();return i.displayWarning(o),r&&!o.isCompatible&&(document.readyState==="loading"?document.addEventListener("DOMContentLoaded",()=>{i.injectBanner(o,n)}):i.injectBanner(o,n)),!o.isCompatible&&typeof t=="function"&&t(o),o}export{i as BrowserCompat,l as initBrowserCompat};
