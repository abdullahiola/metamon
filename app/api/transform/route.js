import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';
import { Anthropic } from '@anthropic-ai/sdk';

const anthropic = new Anthropic({
    apiKey: process.env.ANTHROPIC_API_KEY,
});

export async function POST(request) {
    try {
        const { prompt } = await request.json();

        if (!prompt || typeof prompt !== 'string') {
            return NextResponse.json({ error: 'prompt is required' }, { status: 400 });
        }

        if (!process.env.ANTHROPIC_API_KEY) {
            return NextResponse.json({
                error: 'ANTHROPIC_API_KEY is missing. Please add it to your .env.local file.'
            }, { status: 500 });
        }

        const METAMON_PATH = path.join(process.cwd(), 'metamon.js');
        const MUTATIONS_PATH = path.join(process.cwd(), 'public', 'mutations.json');

        // Read current code of metamon.js
        let currentCode = '';
        try {
            currentCode = fs.readFileSync(METAMON_PATH, 'utf-8');
        } catch (e) {
            currentCode = '// METAMON ORIGINAL';
        }

        // 1. CALL CLAUDE
        const response = await anthropic.messages.create({
            model: "claude-3-5-sonnet-20241022",
            max_tokens: 1536,
            system: `You are Metamon, a self-modifying AI entity. The user will provide a 'vision'. 
You must generate a small, self-contained Node.js script that fulfills this vision.

Format your response exactly as follows:
<rationale>
Step 1: Concise thought about the vision...
Step 2: Concise thought about the logic...
Step 3: Concise thought about the execution...
</rationale>
<code>
// The Node.js code here
</code>

RULES:
1. The rationale should be 3-5 steps.
2. The code should be interesting (use intervals, console tricks, or ASCII art).
3. Keep the code under 50 lines.
4. Do NOT use markdown code blocks outside the tags.`,
            messages: [{ role: "user", content: prompt }],
        });

        const rawContent = response.content[0].text;

        // Parse rationale and code
        const rationaleMatch = rawContent.match(/<rationale>([\s\S]*?)<\/rationale>/);
        const codeMatch = rawContent.match(/<code>([\s\S]*?)<\/code>/);

        const rawRationale = rationaleMatch ? rationaleMatch[1].trim() : "Synthesizing neural pathways...";
        const targetCode = codeMatch ? codeMatch[1].trim() : rawContent.trim();
        const rationaleSteps = rawRationale.split('\n').map(s => s.trim()).filter(s => s.length > 0);

        const mutations = [];
        const timestamp = Date.now();

        // 2. INITIAL STATE
        mutations.push({
            step: 0,
            timestamp,
            code: currentCode,
            label: 'original',
            progress: 0
        });

        // 3. AI RATIONALE (Real thoughts from Claude)
        let currentThoughtCode = currentCode;
        rationaleSteps.forEach((thought, idx) => {
            currentThoughtCode = `// [Claude]: ${thought}\n` + currentThoughtCode;
            mutations.push({
                step: `thought_${idx}`,
                timestamp: timestamp + (idx * 200),
                code: currentThoughtCode,
                progress: 0,
                isThought: true,
                rationale: thought
            });
        });

        // 4. MORPHING
        const totalSteps = targetCode.length;
        const snapshotCount = 100;
        const snapshotInterval = Math.max(1, Math.floor(totalSteps / snapshotCount));

        for (let i = 1; i <= totalSteps; i++) {
            const transformed = targetCode.slice(0, i);
            const remaining = currentThoughtCode.slice(i);
            const currentState = transformed + remaining;

            if (i % snapshotInterval === 0 || i === totalSteps) {
                mutations.push({
                    step: i,
                    timestamp: timestamp + 2000 + i,
                    code: currentState,
                    progress: Math.floor((i / totalSteps) * 100),
                    rationale: rationaleSteps[rationaleSteps.length - 1] // Keep the last thought during morphing
                });
            }
        }

        // 5. FINAL STATE
        mutations.push({
            step: totalSteps,
            timestamp: Date.now(),
            code: targetCode,
            label: 'final',
            progress: 100
        });

        // PERMANENT SELF-REWRITE (best-effort — read-only in production, works in dev)
        try { fs.writeFileSync(METAMON_PATH, targetCode, 'utf-8'); } catch (e) { }
        try { fs.writeFileSync(MUTATIONS_PATH, JSON.stringify(mutations, null, 2), 'utf-8'); } catch (e) { }

        // Return mutations directly in response so frontend works in production
        return NextResponse.json({
            success: true,
            message: 'Claude Metamorphosis successful',
            mutations,
            mutationCount: mutations.length
        });

    } catch (error) {
        console.error('Transformation error:', error);
        return NextResponse.json({ error: 'Transformation failed: ' + error.message }, { status: 500 });
    }
}
