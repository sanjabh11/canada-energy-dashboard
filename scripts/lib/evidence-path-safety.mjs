import { existsSync, realpathSync } from 'node:fs';
import path from 'node:path';

export function isInsideDirectory(candidatePath, rootPath) {
  const relativePath = path.relative(rootPath, candidatePath);
  return relativePath === '' || (!relativePath.startsWith('..') && !path.isAbsolute(relativePath));
}

function nearestExistingAncestor(startPath) {
  let currentPath = path.resolve(startPath);
  while (!existsSync(currentPath)) {
    const parentPath = path.dirname(currentPath);
    if (parentPath === currentPath) return currentPath;
    currentPath = parentPath;
  }
  return currentPath;
}

export function validateExistingEvidencePathInsideRoot({ evidenceRoot, evidencePath }) {
  const resolvedRoot = path.resolve(evidenceRoot);
  const resolvedEvidencePath = path.resolve(evidencePath);

  if (!isInsideDirectory(resolvedEvidencePath, resolvedRoot)) {
    return 'evidence_file_reference must stay inside --evidence-root.';
  }

  const realRoot = realpathSync(resolvedRoot);
  const realEvidencePath = realpathSync(resolvedEvidencePath);
  if (!isInsideDirectory(realEvidencePath, realRoot)) {
    return 'evidence_file_reference resolves outside --evidence-root; symlink escapes are not allowed.';
  }

  return null;
}

export function validateWritableArtifactPathInsideRoot({ evidenceRoot, artifactPath }) {
  const resolvedRoot = path.resolve(evidenceRoot);
  const resolvedArtifactPath = path.resolve(artifactPath);

  if (!isInsideDirectory(resolvedArtifactPath, resolvedRoot)) {
    return '--artifact-file must stay inside --evidence-root.';
  }

  if (!existsSync(resolvedRoot)) return null;

  const realRoot = realpathSync(resolvedRoot);
  const realCheckPath = existsSync(resolvedArtifactPath)
    ? resolvedArtifactPath
    : nearestExistingAncestor(path.dirname(resolvedArtifactPath));
  const realArtifactBoundary = realpathSync(realCheckPath);

  if (!isInsideDirectory(realArtifactBoundary, realRoot)) {
    return '--artifact-file resolves outside --evidence-root; symlink escapes are not allowed.';
  }

  return null;
}
