const IS_CORDOVA = !!window.cordova;

function getFileNameFromUrl(url) {
  return url.pathname.substring(url.pathname.lastIndexOf("/") + 1);
}

function getFileExtension(fileName) {
  const re = /(?:\.([^.]+))?$/;
  return re.exec(fileName)[1];
}

const cordova = {
  async readTextFile() {
    try {
      const uri = await new Promise((resolve, reject) =>
        window.fileChooser.open({ mime: "text/plain" }, resolve, reject),
      );
      const actualPath = await new Promise((resolve, reject) =>
        window.FilePath.resolveNativePath(uri, resolve, reject),
      );
      const filename = getFileNameFromUrl(new URL(actualPath));
      const entry = await new Promise((resolve, reject) =>
        window.resolveLocalFileSystemURL(uri, resolve, reject),
      );
      const file = await new Promise((resolve, reject) =>
        entry.file(resolve, reject),
      );

      const content = await new Promise((resolve, reject) => {
        var reader = new FileReader();

        reader.onload = function() {
          resolve(this.result);
        };

        reader.onerror = reject;
        reader.onabort = reject;

        reader.readAsText(file);
      });

      return { name: filename, content };
    } catch (err) {
      console.log(err);
    }
  },

  async _getFileEntry(opts) {
    const extension = getFileExtension(opts.suggestedName);
    const folder = window.cordova.file.externalDataDirectory;

    const res = await new Promise((resolve) =>
      navigator.notification.prompt(
        i18n.getMessage("dialogFileNameDescription", {
          folder: folder.slice("file://".length),
          interpolation: { escapeValue: false },
        }),
        resolve,
        i18n.getMessage("dialogFileNameTitle"),
        [i18n.getMessage("initialSetupButtonSave"), i18n.getMessage("cancel")],
        opts.suggestedName,
      ),
    );

    if (res.buttonIndex !== 1) return;

    const newExtension = getFileExtension(res.input1);
    let fileName = res.input1;
    if (newExtension === undefined) {
      fileName += `.${extension}`;
    }

    const directoryEntry = await new Promise((resolve, reject) =>
      window.resolveLocalFileSystemURL(folder, resolve, reject),
    );

    try {
      const fileEntry = await new Promise((resolve, reject) =>
        directoryEntry.getFile(fileName, { create: false }, resolve, reject),
      );

      const resp = await new Promise((resolve) =>
        navigator.notification.confirm(
          i18n.getMessage("dialogFileAlreadyExistsDescription"),
          resolve,
          i18n.getMessage("dialogFileAlreadyExistsTitle"),
          [i18n.getMessage("yes"), i18n.getMessage("cancel")],
        ),
      );
      if (resp === 1) {
        return fileEntry;
      } else {
        console.log("Canceled: file already exists");
      }
    } catch {
      return await new Promise((resolve, reject) =>
        directoryEntry.getFile(fileName, { create: true }, resolve, reject),
      );
    }
  },

  async getWriteStream(opts) {
    try {
      const entry = await this._getFileEntry(opts);
      if (!entry) return;

      const writer = await new Promise((resolve) => entry.createWriter(resolve));

      let resolve = null;
      let reject = null;

      writer.onwriteend = () => {
        if (writer.error) reject(writer.error);
        else resolve();
      };

      return {
        write(data) {
          return new Promise((res, rej) => {
            resolve = res;
            reject = rej;

            writer.write(data);
          });
        },
        close() {
          writer.onwriteend = null;
        },
      };
    } catch (err) {
      console.log(err);
    }
  },

  async writeTextFile(text, opts) {
    const writer = await this.getWriteStream(opts);
    if (!writer) return;

    try {
      await new Promise((resolve, reject) => {
        writer.onwriteend = resolve;
        writer.onerror = reject;
        writer.write(new Blob([text], { type: "text/plain" }));
      });
    } catch (err) {
      console.log(err);
    }
  },
};

// https://fs.spec.whatwg.org/
// https://wicg.github.io/file-system-access/
const web = {
  async readTextFile(opts) {
    try {
      const [handle] = await showOpenFilePicker({
        types: [
          {
            description: opts.description,
            accept: { "text/plain": opts.extensions },
          },
        ],
      });
      if (!handle) return;

      const file = await handle.getFile();
      return { name: file.name, content: await file.text() };
    } catch (err) {
      console.log(err);
    }
  },

  async getWriteStream(opts) {
    try {
      const handle = await showSaveFilePicker({
        suggestedName: opts.suggestedName,
        types: [
          {
            description: opts.description,
            accept: { [opts.mimeType]: `.${getFileExtension(opts.suggestedName)}` },
          },
        ],
      });
      return await handle.createWritable();
    } catch (err) {
      console.log(err);
    }
  },

  async writeTextFile(text, opts) {
    const writer = await this.getWriteStream({ ...opts, mimeType: "text/plain" });
    if (!writer) return;

    try {
      await writer.write(new Blob([text], { type: "text/plain" }));
      await writer.close();
    } catch (err) {
      console.log(err);
    }
  },
};

window.filesystem = IS_CORDOVA ? cordova : web;
