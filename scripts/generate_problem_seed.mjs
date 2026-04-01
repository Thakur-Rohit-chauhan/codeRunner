import fs from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { getProblemDetail, mockProblems, topicTags } from '../services/frontend/src/utils/mockData.js'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const outputPath = path.resolve(__dirname, '../services/frontend/src/data/problemSeed.json')

const problems = mockProblems.map((problem) => {
  const detail = getProblemDetail(problem.id)

  return {
    id: problem.id,
    title: problem.title,
    domain: problem.domain,
    difficulty: problem.difficulty,
    acceptance: problem.acceptance,
    tags: Array.isArray(problem.tags) ? problem.tags : [],
    companies: Array.isArray(detail?.companies) ? detail.companies : [],
    description: typeof detail?.description === 'string' ? detail.description : '',
    examples: Array.isArray(detail?.examples) ? detail.examples : [],
    constraints: Array.isArray(detail?.constraints) ? detail.constraints : [],
    starterCode: detail?.starterCode && typeof detail.starterCode === 'object' ? detail.starterCode : {},
    testCases: Array.isArray(detail?.testCases) ? detail.testCases : [],
    defaultStatus: problem.status || null,
    defaultStarred: Boolean(problem.starred),
    defaultLastSubmitted: problem.lastSubmitted || null,
  }
})

const payload = {
  generatedAt: new Date().toISOString(),
  topics: topicTags,
  problems,
}

await fs.writeFile(outputPath, `${JSON.stringify(payload, null, 2)}\n`, 'utf8')
console.log(`Wrote ${problems.length} problems to ${outputPath}`)
