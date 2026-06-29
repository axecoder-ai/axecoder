"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.gitCommitPushPrPrompt = exports.gitOpenUrl = exports.gitForgeStatus = exports.gitShow = exports.gitDiff = exports.gitCommit = exports.gitStageAll = exports.gitUnstage = exports.gitStage = exports.gitStatus = exports.runGit = void 0;
const node_child_process_1 = require("node:child_process");
const node_path_1 = __importDefault(require("node:path"));
const vscode = __importStar(require("vscode"));
const output_channel_1 = require("@axecoder/core/output-channel");
const runGit = (cwd, args) => new Promise((resolve, reject) => {
    const proc = (0, node_child_process_1.spawn)('git', args, { cwd, env: process.env });
    let out = '';
    let err = '';
    proc.stdout?.on('data', (d) => {
        out += d.toString();
    });
    proc.stderr?.on('data', (d) => {
        err += d.toString();
    });
    proc.on('close', (code) => {
        if (code === 0)
            resolve(out.trim());
        else
            reject(new Error(err.trim() || `git exit ${code}`));
    });
    proc.on('error', () => reject(new Error('Git not installed or not executable')));
});
exports.runGit = runGit;
const resolveGitPath = (cwd, file) => {
    const f = file.trim();
    if (!f)
        throw new Error('Missing file path');
    return node_path_1.default.isAbsolute(f) ? f : node_path_1.default.join(cwd, f);
};
const gitStatus = async (cwd) => {
    if (!cwd)
        return { ok: false, error: 'No project open' };
    try {
        const branch = await (0, exports.runGit)(cwd, ['rev-parse', '--abbrev-ref', 'HEAD']);
        const raw = await (0, exports.runGit)(cwd, ['status', '--porcelain']);
        const changes = raw
            ? raw.split('\n').filter(Boolean).map((line) => {
                const code = line.slice(0, 2);
                const file = line.slice(3).trim();
                return { code, file };
            })
            : [];
        return { ok: true, branch, changes };
    }
    catch (e) {
        return { ok: false, error: e instanceof Error ? e.message : 'Git unavailable' };
    }
};
exports.gitStatus = gitStatus;
const gitStage = async (cwd, file) => {
    if (!cwd)
        return { ok: false, error: 'No project open' };
    try {
        const p = resolveGitPath(cwd, file);
        await (0, exports.runGit)(cwd, ['add', '--', p]);
        (0, output_channel_1.logOutput)('Git', `Staged ${file}`);
        return { ok: true };
    }
    catch (e) {
        return { ok: false, error: e instanceof Error ? e.message : 'Stage failed' };
    }
};
exports.gitStage = gitStage;
const gitUnstage = async (cwd, file) => {
    if (!cwd)
        return { ok: false, error: 'No project open' };
    try {
        const p = resolveGitPath(cwd, file);
        await (0, exports.runGit)(cwd, ['reset', 'HEAD', '--', p]);
        (0, output_channel_1.logOutput)('Git', `Unstaged ${file}`);
        return { ok: true };
    }
    catch (e) {
        return { ok: false, error: e instanceof Error ? e.message : 'Unstage failed' };
    }
};
exports.gitUnstage = gitUnstage;
const gitStageAll = async (cwd) => {
    if (!cwd)
        return { ok: false, error: 'No project open' };
    try {
        await (0, exports.runGit)(cwd, ['add', '-A']);
        (0, output_channel_1.logOutput)('Git', 'Staged all changes');
        return { ok: true };
    }
    catch (e) {
        return { ok: false, error: e instanceof Error ? e.message : 'Stage all failed' };
    }
};
exports.gitStageAll = gitStageAll;
const gitCommit = async (cwd, message, amend) => {
    if (!cwd)
        return { ok: false, error: 'No project open' };
    try {
        const args = amend ? ['commit', '--amend', '-m', message] : ['commit', '-m', message];
        await (0, exports.runGit)(cwd, args);
        (0, output_channel_1.logOutput)('Git', amend ? 'Amended commit' : `Committed: ${message}`);
        return { ok: true };
    }
    catch (e) {
        return { ok: false, error: e instanceof Error ? e.message : 'Commit failed' };
    }
};
exports.gitCommit = gitCommit;
const gitDiff = async (cwd, staged) => {
    if (!cwd)
        return { ok: false, error: 'No project open' };
    try {
        const args = staged ? ['diff', '--cached'] : ['diff'];
        const text = await (0, exports.runGit)(cwd, args);
        return { ok: true, text };
    }
    catch (e) {
        return { ok: false, error: e instanceof Error ? e.message : 'Diff failed' };
    }
};
exports.gitDiff = gitDiff;
const gitShow = async (cwd, file, staged) => {
    if (!cwd)
        return { ok: false, error: 'No project open' };
    try {
        const p = resolveGitPath(cwd, file);
        const args = staged ? ['show', `:${p}`] : ['show', `HEAD:${p}`];
        const text = await (0, exports.runGit)(cwd, args);
        return { ok: true, text };
    }
    catch (e) {
        return { ok: false, error: e instanceof Error ? e.message : 'Show failed' };
    }
};
exports.gitShow = gitShow;
const gitForgeStatus = async (cwd) => {
    const { buildGitForgeContext } = await Promise.resolve().then(() => __importStar(require('@axecoder/core/git-forge/detect-forge')));
    try {
        const ctx = await buildGitForgeContext(cwd);
        return { ok: true, ...ctx };
    }
    catch (e) {
        return { ok: false, error: e instanceof Error ? e.message : String(e) };
    }
};
exports.gitForgeStatus = gitForgeStatus;
const gitOpenUrl = async (url) => {
    await vscode.env.openExternal(vscode.Uri.parse(url));
    return { ok: true };
};
exports.gitOpenUrl = gitOpenUrl;
const gitCommitPushPrPrompt = async (cwd) => {
    const { buildCommitPushPrPrompt } = await Promise.resolve().then(() => __importStar(require('@axecoder/core/git-forge/forge-prompt')));
    try {
        const text = await buildCommitPushPrPrompt(cwd);
        return { ok: true, text };
    }
    catch (e) {
        return { ok: false, error: e instanceof Error ? e.message : String(e) };
    }
};
exports.gitCommitPushPrPrompt = gitCommitPushPrPrompt;
//# sourceMappingURL=git-service.js.map