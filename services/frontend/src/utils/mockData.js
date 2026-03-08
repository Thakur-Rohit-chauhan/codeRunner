export const mockProblems = [
    { id: 1758, title: 'Minimum Changes To Make Alternating Binary String', domain: 'DSA', difficulty: 'Easy', acceptance: '66.0%', tags: ['String'], status: 'pinned', starred: false, lastSubmitted: null },
    { id: 1, title: 'Two Sum', domain: 'DSA', difficulty: 'Easy', acceptance: '57.1%', tags: ['Array', 'Hash Table'], status: 'solved', starred: false, lastSubmitted: '2026-03-05T10:30:00Z' },
    { id: 2, title: 'Add Two Numbers', domain: 'DSA', difficulty: 'Medium', acceptance: '48.0%', tags: ['Linked List', 'Math'], status: 'solved', starred: true, lastSubmitted: '2026-03-04T15:20:00Z' },
    { id: 3, title: 'Longest Substring Without Repeating Characters', domain: 'DSA', difficulty: 'Medium', acceptance: '38.6%', tags: ['String', 'Sliding Window'], status: 'solved', starred: true, lastSubmitted: '2026-03-03T09:45:00Z' },
    { id: 4, title: 'Median of Two Sorted Arrays', domain: 'DSA', difficulty: 'Hard', acceptance: '46.0%', tags: ['Binary Search', 'Array'], status: 'solved', starred: true, lastSubmitted: '2026-03-01T18:00:00Z' },
    { id: 5, title: 'Longest Palindromic Substring', domain: 'DSA', difficulty: 'Medium', acceptance: '37.4%', tags: ['String', 'Dynamic Programming'], status: null, starred: false, lastSubmitted: null },
    { id: 6, title: 'Zigzag Conversion', domain: 'DSA', difficulty: 'Medium', acceptance: '53.6%', tags: ['String'], status: null, starred: false, lastSubmitted: null },
    { id: 7, title: 'Reverse Integer', domain: 'DSA', difficulty: 'Medium', acceptance: '31.6%', tags: ['Math'], status: 'solved', starred: true, lastSubmitted: '2026-02-28T14:30:00Z' },
    { id: 8, title: 'String to Integer (atoi)', domain: 'DSA', difficulty: 'Medium', acceptance: '20.6%', tags: ['String'], status: 'solved', starred: true, lastSubmitted: '2026-02-27T11:15:00Z' },
    { id: 9, title: 'Palindrome Number', domain: 'DSA', difficulty: 'Easy', acceptance: '60.3%', tags: ['Math'], status: 'solved', starred: true, lastSubmitted: '2026-02-25T20:00:00Z' },
    { id: 10, title: 'Regular Expression Matching', domain: 'DSA', difficulty: 'Hard', acceptance: '30.5%', tags: ['String', 'Dynamic Programming'], status: null, starred: false, lastSubmitted: null },
    { id: 11, title: 'Container With Most Water', domain: 'DSA', difficulty: 'Medium', acceptance: '59.6%', tags: ['Array', 'Two Pointers'], status: null, starred: true, lastSubmitted: null },
    { id: 12, title: 'Integer to Roman', domain: 'DSA', difficulty: 'Medium', acceptance: '70.5%', tags: ['Math', 'String'], status: null, starred: true, lastSubmitted: null },
    { id: 13, title: 'Roman to Integer', domain: 'DSA', difficulty: 'Easy', acceptance: '66.3%', tags: ['Math', 'String'], status: null, starred: true, lastSubmitted: null },
    { id: 14, title: 'Longest Common Prefix', domain: 'DSA', difficulty: 'Easy', acceptance: '47.2%', tags: ['String'], status: 'solved', starred: true, lastSubmitted: '2026-02-20T16:45:00Z' },
    { id: 15, title: 'Image Classification with CNN', domain: 'ML', difficulty: 'Medium', acceptance: '52.3%', tags: ['Neural Networks', 'Computer Vision'], status: null, starred: false, lastSubmitted: null },
    { id: 16, title: 'Sentiment Analysis NLP Pipeline', domain: 'ML', difficulty: 'Hard', acceptance: '28.7%', tags: ['NLP', 'Transformers'], status: 'attempted', starred: false, lastSubmitted: '2026-03-02T08:30:00Z' },
    { id: 17, title: 'Linear Regression from Scratch', domain: 'ML', difficulty: 'Easy', acceptance: '67.1%', tags: ['Regression', 'Statistics'], status: 'solved', starred: false, lastSubmitted: '2026-02-22T13:00:00Z' },
    { id: 18, title: 'Packet Capture Analysis', domain: 'CTF', difficulty: 'Easy', acceptance: '58.4%', tags: ['Packet Analysis', 'Wireshark'], status: null, starred: false, lastSubmitted: null },
    { id: 19, title: 'Buffer Overflow Exploit', domain: 'CTF', difficulty: 'Hard', acceptance: '18.2%', tags: ['Binary Exploit', 'Stack'], status: null, starred: false, lastSubmitted: null },
    { id: 20, title: 'SQL Injection Challenge', domain: 'CTF', difficulty: 'Medium', acceptance: '42.6%', tags: ['SQL', 'Web Security'], status: 'solved', starred: true, lastSubmitted: '2026-02-18T22:10:00Z' },
]

export const mockProblemDetail = {
    id: 1,
    title: 'Two Sum',
    domain: 'DSA',
    difficulty: 'Easy',
    acceptance: '49.5%',
    tags: ['Array', 'Hash Table'],
    companies: ['Google', 'Amazon', 'Meta'],
    description: `Given an array of integers \`nums\` and an integer \`target\`, return *indices of the two numbers such that they add up to \`target\`*.

You may assume that each input would have **exactly one solution**, and you may not use the *same* element twice.

You can return the answer in any order.`,
    examples: [
        {
            input: 'nums = [2,7,11,15], target = 9',
            output: '[0,1]',
            explanation: 'Because nums[0] + nums[1] == 9, we return [0, 1].',
        },
        {
            input: 'nums = [3,2,4], target = 6',
            output: '[1,2]',
            explanation: null,
        },
        {
            input: 'nums = [3,3], target = 6',
            output: '[0,1]',
            explanation: null,
        },
    ],
    constraints: [
        '2 <= nums.length <= 10⁴',
        '-10⁹ <= nums[i] <= 10⁹',
        '-10⁹ <= target <= 10⁹',
        'Only one valid answer exists.',
    ],
    starterCode: {
        'cpp': '#include <vector>\nusing namespace std;\n\nclass Solution {\npublic:\n    vector<int> twoSum(vector<int>& nums, int target) {\n        // Write your solution here\n    }\n};',
        'python': 'class Solution:\n    def twoSum(self, nums: list[int], target: int) -> list[int]:\n        # Write your solution here\n        pass',
        'java': 'class Solution {\n    public int[] twoSum(int[] nums, int target) {\n        // Write your solution here\n    }\n}',
        'javascript': '/**\n * @param {number[]} nums\n * @param {number} target\n * @return {number[]}\n */\nvar twoSum = function(nums, target) {\n    // Write your solution here\n};',
        'go': 'func twoSum(nums []int, target int) []int {\n    // Write your solution here\n}',
    },
    testCases: [
        { input: '[2,7,11,15]\n9', expectedOutput: '[0,1]' },
        { input: '[3,2,4]\n6', expectedOutput: '[1,2]' },
    ],
}

export const mockContestRatingHistory = [
    { date: 'Jan', rating: 1200 },
    { date: 'Feb', rating: 1350 },
    { date: 'Mar', rating: 1280 },
    { date: 'Apr', rating: 1420 },
    { date: 'May', rating: 1510 },
    { date: 'Jun', rating: 1480 },
    { date: 'Jul', rating: 1620 },
    { date: 'Aug', rating: 1590 },
    { date: 'Sep', rating: 1700 },
    { date: 'Oct', rating: 1750 },
    { date: 'Nov', rating: 1820 },
    { date: 'Dec', rating: 1847 },
]

export const mockHeatmapData = (() => {
    const data = []
    const today = new Date()
    for (let i = 365; i >= 0; i--) {
        const d = new Date(today)
        d.setDate(d.getDate() - i)
        data.push({
            date: d.toISOString().split('T')[0],
            count: Math.random() > 0.4 ? Math.floor(Math.random() * 8) : 0,
        })
    }
    return data
})()

export const mockRecentSubmissions = [
    { id: 1, problem: 'Two Sum', language: 'C++', time: '2 hours ago', status: 'Accepted', runtime: '4ms' },
    { id: 2, problem: 'Add Two Numbers', language: 'Python', time: '5 hours ago', status: 'Wrong Answer', runtime: '—' },
    { id: 3, problem: 'Reverse Linked List', language: 'Java', time: '1 day ago', status: 'Accepted', runtime: '1ms' },
    { id: 4, problem: 'Linear Regression from Scratch', language: 'Python', time: '2 days ago', status: 'Accepted', runtime: '1.2s' },
    { id: 5, problem: 'Packet Capture Analysis', language: 'Python', time: '3 days ago', status: 'Accepted', runtime: '340ms' },
]

export const topicTags = [
    'Array', 'String', 'Hash Table', 'Dynamic Programming', 'Math', 'Sorting',
    'Greedy', 'Graph', 'Tree', 'BFS', 'DFS', 'Binary Search', 'Linked List',
    'Neural Networks', 'NLP', 'Computer Vision', 'Regression', 'Classification',
    'Packet Analysis', 'Binary Exploit', 'Web Security', 'Cryptography', 'SQL',
]
