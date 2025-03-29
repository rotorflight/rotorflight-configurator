export default class GithubUtil {
    static containsBranchName(url) {
        return url.includes("/tree/");
    }

    static isUrlGithubRepo(url) {
        return url.trim().toLowerCase().startsWith("https://github.com/");
    }

    static getBranchName(url) {
        const pattern = /https:\/\/github\.com\/[^/]+\/[^/]+\/tree\/([^/]+)/;
        const match = url.match(pattern);

        return match ? match[1] : null;
    }
}
