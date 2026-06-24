export default {
  containsBranchName(url) {
    return url.includes("/tree/");
  },

  isUrlGithubRepo(url) {
    return url.trim().toLowerCase().startsWith("https://github.com/");
  },

  getBranchName(url) {
    const pattern = /https:\/\/github\.com\/[^/]+\/[^/]+\/tree\/([^/]+)/;
    const match = url.match(pattern);

    return match ? match[1] : null;
  },
};
