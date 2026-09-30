import GithubUtil from "@/js/presets/source/github.js";
import Retriever from "@/js/presets/source/retriever.js";

/**
 * @typedef {import('@/js/presets/source/retriever.js').SourceIndex}    SourceIndex
 */

export class Metadata {
  name = "New Source";
  url = "";
  branch = "";
  official = false;
  active;

  constructor(name, url, branch = "") {
    this.name = name;
    this.url = url;
    this.branch = branch;
  }

  get trimmedUrl() {
    let url = this.url.trim();

    if (!url.endsWith("/")) {
      url += "/";
    }
    return url;
  }

  get trimmedBranch() {
    let branch = this.branch;
    if (branch.startsWith("/")) {
      branch = branch.slice(1);
    }
    if (branch.endsWith("/")) {
      branch = branch.slice(0, -1);
    }
    return branch;
  }

  get rawUrl() {
    if (GithubUtil.isUrlGithubRepo(this.url)) {
      return `https://raw.githubusercontent.com${this.trimmedUrl.slice("https://github.com".length)}${this.trimmedBranch}/`;
    }
    return this.trimmedUrl;
  }

  get viewUrl() {
    if (GithubUtil.isUrlGithubRepo(this.url)) {
      return `${this.trimmedUrl}blob/${this.trimmedBranch}/`;
    }
    return this.trimmedUrl;
  }
}

/**
 * A presets source (repository) and, once loaded, its index.
 */
export class Source {
  /**
   * @type {Metadata}
   */
  #metadata;

  /**
   * @type {?Retriever}
   */
  #retriever = null;

  /**
   * @param {Metadata} metadata
   */
  constructor(metadata) {
    this.#metadata = metadata;
  }

  /**
   * @returns {Metadata}
   */
  get metadata() {
    return this.#metadata;
  }

  get rawUrl() {
    return this.#metadata.rawUrl;
  }

  /**
   * @returns {Retriever}
   */
  get retriever() {
    return this.#retriever;
  }

  /**
   * @returns {SourceIndex} - The index object
   */
  get index() {
    return this.#retriever.index;
  }

  /**
   * Sets up the retriever and retrieves the index.
   * @returns {Promise<void>}
   */
  async loadData() {
    this.#retriever = new Retriever(this.rawUrl);
    await this.#retriever.retrieveIndex();
  }
}
