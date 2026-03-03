const GITHUB_API_URL = "https://api.github.com";

export async function getFileLastCommitInfo(project, branch, filename) {
  const url = `${GITHUB_API_URL}/repos/${encodeURI(project)}/commits?sha=${encodeURIComponent(branch)}&path=${encodeURIComponent(filename)}`;
  const res = await fetch(url);
  if (!res.ok) {
    throw new Error(`HTTP ${r.status}`);
  }
  const commits = await res.json();

  try {
    return {
      commitHash: commits[0].sha.substring(0, 8),
      date: commits[0].commit.author.date,
    };
  } catch (err) {
    console.log(`Error while parsing commit: ${err}`);
  }
}

export async function getContents(project, branch, path) {
  const url = `${GITHUB_API_URL}/repos/${encodeURI(project)}/contents/${encodeURIComponent(path)}?ref=${encodeURIComponent(branch)}`;
  const res = await fetch(url);
  if (!res.ok) {
    throw new Error(`HTTP ${r.status}`);
  }
  return await res.json();
}
