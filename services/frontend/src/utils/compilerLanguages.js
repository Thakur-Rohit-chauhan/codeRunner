const LANGUAGE_CATALOG = {
    cpp: { key: 'cpp', label: 'C++', monaco: 'cpp' },
    python: { key: 'python', label: 'Python', monaco: 'python' },
    java: { key: 'java', label: 'Java', monaco: 'java' },
    javascript: { key: 'javascript', label: 'JavaScript', monaco: 'javascript' },
    go: { key: 'go', label: 'Go', monaco: 'go' },
    c: { key: 'c', label: 'C', monaco: 'c' },
    bash: { key: 'bash', label: 'Bash', monaco: 'shell' },
    powershell: { key: 'powershell', label: 'PowerShell', monaco: 'powershell' },
    sql: { key: 'sql', label: 'SQL', monaco: 'sql' },
    r: { key: 'r', label: 'R', monaco: 'r' },
    julia: { key: 'julia', label: 'Julia', monaco: 'julia' },
}

const DOMAIN_LANGUAGE_KEYS = {
    DSA: ['cpp', 'python', 'java', 'javascript', 'go'],
    ML: ['python', 'r', 'sql', 'julia'],
    CTF: ['python', 'bash', 'c', 'cpp', 'javascript', 'powershell'],
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

function getDsaStarterCode(title, languageKey) {
    switch (languageKey) {
        case 'cpp':
            return `// ${title}
class Solution {
public:
    void solve() {
        // Write your solution here
    }
};`
        case 'python':
            return `# ${title}
class Solution:
    def solve(self):
        # Write your solution here
        pass`
        case 'java':
            return `// ${title}
class Solution {
    public void solve() {
        // Write your solution here
    }
}`
        case 'javascript':
            return `// ${title}
var solve = function() {
    // Write your solution here
};`
        case 'go':
            return `// ${title}
func solve() {
    // Write your solution here
}`
        default:
            return `// ${title}
// Write your solution here`
    }
}

function getMlStarterCode(title, languageKey) {
    switch (languageKey) {
        case 'python':
            return `# ${title}
import numpy as np

def train_model(train_data, valid_data):
    # TODO: preprocess data, train a model, and return metrics
    pass

def predict(model, features):
    # TODO: return predictions for evaluation
    pass`
        case 'r':
            return `# ${title}
library(tidyverse)

train_model <- function(train_data, valid_data) {
  # TODO: preprocess data and fit a model
}

predict_labels <- function(model, data) {
  # TODO: return predictions
}`
        case 'sql':
            return `-- ${title}
-- Use SQL for feature engineering or dataset validation.
WITH dataset AS (
    SELECT *
    FROM training_data
)
SELECT *
FROM dataset
LIMIT 100;`
        case 'julia':
            return `# ${title}
using DataFrames
using Statistics

function train_model(train_df, valid_df)
    # TODO: fit a model and report validation accuracy
end

function predict(model, features)
    # TODO: return predictions
end`
        default:
            return `# ${title}
# Write your ML pipeline here`
    }
}

function getCyberStarterCode(title, languageKey) {
    switch (languageKey) {
        case 'python':
            return `# ${title}
import requests

def solve():
    # TODO: automate the analysis or exploit flow
    pass

if __name__ == '__main__':
    solve()`
        case 'bash':
            return `#!/usr/bin/env bash
# ${title}
set -euo pipefail

# TODO: automate the recon / exploit flow`
        case 'c':
            return `// ${title}
#include <stdio.h>
#include <string.h>

int main(void) {
    // TODO: craft or verify the exploit logic
    return 0;
}`
        case 'cpp':
            return `// ${title}
#include <iostream>
#include <string>

int main() {
    // TODO: implement the exploit or parser
    return 0;
}`
        case 'javascript':
            return `// ${title}
async function solve() {
    // TODO: automate the challenge steps
}

solve()`
        case 'powershell':
            return `# ${title}
Set-StrictMode -Version Latest

function Invoke-Challenge {
    # TODO: automate the exploit or analysis flow
}

Invoke-Challenge`
        default:
            return `# ${title}
# Write your cyber challenge solution here`
    }
}

export function getStarterCodeForLanguage(problem, languageKey) {
    const title = problem?.title || 'Untitled Problem'
    const existingStarter = problem?.starterCode?.[languageKey]
    if (existingStarter) return existingStarter

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
