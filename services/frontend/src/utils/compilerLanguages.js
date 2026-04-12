const LANGUAGE_CATALOG = {
    cpp: { key: 'cpp', label: 'C++', monaco: 'cpp' },
    python: { key: 'python', label: 'Python', monaco: 'python' },
    java: { key: 'java', label: 'Java', monaco: 'java' },
    javascript: { key: 'javascript', label: 'JavaScript', monaco: 'javascript' },
    typescript: { key: 'typescript', label: 'TypeScript', monaco: 'typescript' },
    go: { key: 'go', label: 'Go', monaco: 'go' },
    c: { key: 'c', label: 'C', monaco: 'c' },
    csharp: { key: 'csharp', label: 'C#', monaco: 'csharp' },
    rust: { key: 'rust', label: 'Rust', monaco: 'rust' },
    kotlin: { key: 'kotlin', label: 'Kotlin', monaco: 'kotlin' },
    bash: { key: 'bash', label: 'Bash', monaco: 'shell' },
    powershell: { key: 'powershell', label: 'PowerShell', monaco: 'powershell' },
    sql: { key: 'sql', label: 'SQL', monaco: 'sql' },
    r: { key: 'r', label: 'R', monaco: 'r' },
    julia: { key: 'julia', label: 'Julia', monaco: 'julia' },
}

const DOMAIN_LANGUAGE_KEYS = {
    DSA: ['cpp', 'python', 'java', 'javascript'],
    ML: ['python', 'r'],
    CTF: ['python', 'bash', 'cpp', 'javascript'],
}

export const languageLabelMap = Object.fromEntries(
    Object.values(LANGUAGE_CATALOG).map((language) => [language.key, language.label])
)

export function getLanguagesForDomain(domain = 'DSA') {
    const keys = DOMAIN_LANGUAGE_KEYS[domain] || DOMAIN_LANGUAGE_KEYS.DSA
    return keys.map((key) => LANGUAGE_CATALOG[key]).filter(Boolean)
}

export function getDefaultLanguageForDomain(domain = 'DSA') {
    return domain === 'DSA' ? 'cpp' : 'python'
}

function getDsaStarterCode(_title, languageKey) {
    switch (languageKey) {
        case 'cpp':
            return `#include <bits/stdc++.h>
using namespace std;

int main() {
    ios::sync_with_stdio(false);
    cin.tie(nullptr);

    // Write your solution here

    return 0;
}`
        case 'c':
            return `#include <stdio.h>

int main(void) {
    // Write your solution here
    return 0;
}`
        case 'python':
            return `# Write your solution here`
        case 'java':
            return `import java.io.*;
import java.util.*;

public class Main {
    public static void main(String[] args) throws Exception {
        // Write your solution here
    }
}`
        case 'javascript':
            return `// Write your solution here`
        case 'typescript':
            return `// Write your solution here`
        case 'go':
            return `package main

func main() {
    // Write your solution here
}`
        case 'csharp':
            return `using System;

public class Program {
    public static void Main() {
        // Write your solution here
    }
}`
        case 'rust':
            return `fn main() {
    // Write your solution here
}`
        case 'kotlin':
            return `fun main() {
    // Write your solution here
}`
        default:
            return `// Write your solution here`
    }
}

function getMlStarterCode(_title, languageKey) {
    switch (languageKey) {
        case 'python':
            return `# Write your solution here`
        case 'r':
            return `# Write your solution here`
        case 'sql':
            return `-- Write your solution here`
        case 'julia':
            return `# Write your solution here`
        default:
            return `# Write your solution here`
    }
}

function getCyberStarterCode(_title, languageKey) {
    switch (languageKey) {
        case 'python':
            return `# Write your solution here`
        case 'bash':
            return `#!/usr/bin/env bash
# Write your solution here`
        case 'c':
            return `#include <stdio.h>

int main(void) {
    // Write your solution here
    return 0;
}`
        case 'cpp':
            return `#include <bits/stdc++.h>
using namespace std;

int main() {
    // Write your solution here
    return 0;
}`
        case 'javascript':
            return `// Write your solution here`
        case 'powershell':
            return `# Write your solution here`
        default:
            return `# Write your solution here`
    }
}

export function getStarterCodeForLanguage(problem, languageKey) {
    const title = problem?.title || 'Untitled Problem'

    if (problem?.domain === 'ML') return getMlStarterCode(title, languageKey)
    if (problem?.domain === 'CTF') return getCyberStarterCode(title, languageKey)
    return getDsaStarterCode(title, languageKey)
}

export function buildStarterCodeMap(problem) {
    return getLanguagesForDomain(problem?.domain).reduce((acc, language) => {
        acc[language.key] = getStarterCodeForLanguage(problem, language.key)
        return acc
    }, {})
}
