const { chromium } = require("playwright");
const fs = require("fs");

const FRONTEND = "http://localhost:5174";
const BACKEND = "http://localhost:8000";
const FARMER = "demo_farmer_01";

(async () => {
    const browser = await chromium.launch({ headless: false });
    const context = await browser.newContext({
        viewport: { width: 1440, height: 900 }
    });
    const page = await context.newPage();

    const results = [];
    const apiCalls = [];
    const consoleErrors = [];
    const failedRequests = [];

    function result(test, status, details = "") {
        results.push({ test, status, details });
        console.log(`[${status}] ${test}${details ? " — " + details : ""}`);
    }

    page.on("console", msg => {
        if (msg.type() === "error") {
            consoleErrors.push(msg.text());
        }
    });

    page.on("requestfailed", request => {
        failedRequests.push({
            method: request.method(),
            url: request.url(),
            error: request.failure()?.errorText
        });
    });

    page.on("request", request => {
        if (
            request.url().includes("/api/")
        ) {
            apiCalls.push({
                type: "request",
                method: request.method(),
                url: request.url(),
                postData: request.postData()
            });
        }
    });

    page.on("response", response => {
        if (response.url().includes("/api/")) {
            apiCalls.push({
                type: "response",
                status: response.status(),
                method: response.request().method(),
                url: response.url()
            });
        }
    });

    async function screenshot(name) {
        await page.screenshot({
            path: `playwright-audit/${name}.png`,
            fullPage: true
        });
    }

    async function reload() {
        await page.reload({ waitUntil: "networkidle" });
        await page.waitForTimeout(700);
    }

    console.log("\n========================================");
    console.log(" KISANSATHI-AI WORKFLOW AUDIT");
    console.log("========================================\n");

    // ==================================================
    // 1. DASHBOARD
    // ==================================================

    await page.goto(FRONTEND, { waitUntil: "networkidle" });
    await page.waitForTimeout(700);

    result(
        "Dashboard loads",
        "PASS"
    );

    await screenshot("workflow-01-dashboard.png");

    // ==================================================
    // 2. GET CURRENT DIARY FROM BACKEND
    // ==================================================

    let originalDiary = [];

    try {
        const response = await page.request.get(
            `${BACKEND}/api/farmer/${FARMER}/diary`
        );

        if (response.ok()) {
            originalDiary = await response.json();

            result(
                "Backend diary retrieval",
                "PASS",
                `${originalDiary.length} existing entries`
            );
        } else {
            result(
                "Backend diary retrieval",
                "FAIL",
                `HTTP ${response.status()}`
            );
        }
    } catch (e) {
        result(
            "Backend diary retrieval",
            "FAIL",
            e.message
        );
    }

    // ==================================================
    // 3. ADD UNIQUE TEST DIARY ENTRY
    // ==================================================

    const testNotes =
        "PLAYWRIGHT_AUDIT_TEST_" +
        Date.now();

    let testDiaryId = null;

    try {
        const response = await page.request.post(
            `${BACKEND}/api/farmer/${FARMER}/diary`,
            {
                data: {
                    date: "2026-08-28",
                    activity_type: "Audit Test Activity",
                    crop: "cotton",
                    notes: testNotes,
                    quantity_cost: "0",
                    status: "planned",
                    triggered_alert: false
                }
            }
        );

        const body = await response.text();

        if (response.status() === 201 || response.status() === 200) {
            let parsed = {};

            try {
                parsed = JSON.parse(body);
            } catch { }

            testDiaryId =
                parsed.id ||
                parsed.entry_id ||
                null;

            result(
                "Add diary entry API",
                "PASS",
                `HTTP ${response.status()}`
            );
        } else {
            result(
                "Add diary entry API",
                "FAIL",
                `HTTP ${response.status()} — ${body}`
            );
        }
    } catch (e) {
        result(
            "Add diary entry API",
            "FAIL",
            e.message
        );
    }

    // ==================================================
    // 4. VERIFY DIARY PERSISTENCE THROUGH API
    // ==================================================

    try {
        const response = await page.request.get(
            `${BACKEND}/api/farmer/${FARMER}/diary`
        );

        const diary = await response.json();

        const found = diary.some(entry =>
            JSON.stringify(entry).includes(testNotes)
        );

        result(
            "Diary entry persists in backend",
            found ? "PASS" : "FAIL",
            found
                ? "Unique test entry found"
                : "Test entry not found"
        );
    } catch (e) {
        result(
            "Diary entry persists in backend",
            "FAIL",
            e.message
        );
    }

    // ==================================================
    // 5. VERIFY FRONTEND SHOWS TEST ENTRY
    // ==================================================

    await reload();

    const testEntryVisible =
        await page.getByText(testNotes, {
            exact: false
        }).count();

    result(
        "New diary entry visible after reload",
        testEntryVisible > 0 ? "PASS" : "FAIL",
        testEntryVisible > 0
            ? "Frontend loaded persisted entry"
            : "Frontend did not display test entry"
    );

    await screenshot("workflow-02-diary-persistence.png");

    // ==================================================
    // 6. AI EXPLAINER — ACTUAL REQUEST
    // ==================================================

    await page.goto(FRONTEND, { waitUntil: "networkidle" });

    const aiButton = page.getByText(
        "Explain Why",
        { exact: false }
    ).first();

    let aiClicked = false;

    if (await aiButton.count()) {
        try {
            await aiButton.click({ timeout: 4000 });
            await page.waitForTimeout(2500);

            aiClicked = true;

            result(
                "AI Explain button interaction",
                "PASS"
            );

            await screenshot("workflow-03-ai.png");
        } catch (e) {
            result(
                "AI Explain button interaction",
                "FAIL",
                e.message
            );
        }
    } else {
        result(
            "AI Explain button interaction",
            "FAIL",
            "Button not found"
        );
    }

    // ==================================================
    // 7. INSPECT AI API CALL
    // ==================================================

    const aiRequests = apiCalls.filter(call =>
        call.url.includes("/api/ai/explain")
    );

    if (aiRequests.length > 0) {
        result(
            "AI backend endpoint called",
            "PASS",
            `${aiRequests.length} API events captured`
        );
    } else if (aiClicked) {
        result(
            "AI backend endpoint called",
            "FAIL",
            "Clicked AI but no /api/ai/explain request captured"
        );
    } else {
        result(
            "AI backend endpoint called",
            "FAIL",
            "AI button could not be clicked"
        );
    }

    // ==================================================
    // 8. AI RESPONSE CONTENT
    // ==================================================

    const aiTextCandidates = [
        "AI Provider",
        "Provider",
        "confidence",
        "Confidence",
        "reason",
        "Reason",
        "recommendation"
    ];

    let aiContentFound = false;

    for (const text of aiTextCandidates) {
        if (
            await page.getByText(text, {
                exact: false
            }).count()
        ) {
            aiContentFound = true;
            break;
        }
    }

    result(
        "AI response/content visible",
        aiContentFound ? "PASS" : "FAIL",
        aiContentFound
            ? "AI-related response content detected"
            : "No obvious AI response content detected"
    );

    // ==================================================
    // 9. ACKNOWLEDGE & POSTPONE
    // ==================================================

    await page.goto(FRONTEND, {
        waitUntil: "networkidle"
    });

    const postponeButton = page.getByText(
        /Acknowledge & Postpone|Postponed/i,
        { exact: false }
    ).first();

    let postponeWorked = false;

    if (await postponeButton.count()) {
        try {
            await postponeButton.click({
                timeout: 4000
            });

            await page.waitForTimeout(1200);

            postponeWorked = true;

            result(
                "Acknowledge & Postpone click",
                "PASS"
            );

            await screenshot(
                "workflow-04-after-postpone.png"
            );
        } catch (e) {
            result(
                "Acknowledge & Postpone click",
                "FAIL",
                e.message
            );
        }
    } else {
        result(
            "Acknowledge & Postpone click",
            "FAIL",
            "Button not found"
        );
    }

    // ==================================================
    // 10. VERIFY POSTPONE UI STATE
    // ==================================================

    const pageText =
        await page.locator("body").innerText();

    const acknowledged =
        /acknowledged|postponed/i.test(pageText);

    result(
        "Postpone produces visible state change",
        postponeWorked && acknowledged
            ? "PASS"
            : "FAIL",
        acknowledged
            ? "Acknowledged/postponed state detected"
            : "No changed state detected"
    );

    // ==================================================
    // 11. REFRESH POSTPONE STATE
    // ==================================================

    if (postponeWorked) {
        await reload();

        const refreshedText =
            await page.locator("body").innerText();

        const persisted =
            /acknowledged|postponed/i.test(
                refreshedText
            );

        result(
            "Postpone state survives refresh",
            persisted ? "PASS" : "FAIL",
            persisted
                ? "State still visible after reload"
                : "State disappeared after reload"
        );

        await screenshot(
            "workflow-05-postpone-refresh.png"
        );
    }

    // ==================================================
    // 12. FARMER PROFILE DATA
    // ==================================================

    try {
        const response = await page.request.get(
            `${BACKEND}/api/farmer/${FARMER}/profile`
        );

        const profile = await response.json();

        const profileUseful =
            profile &&
            Object.keys(profile).length >= 3;

        result(
            "Farmer profile contains actual data",
            profileUseful ? "PASS" : "FAIL",
            profileUseful
                ? Object.keys(profile).join(", ")
                : "Profile response appears incomplete"
        );
    } catch (e) {
        result(
            "Farmer profile contains actual data",
            "FAIL",
            e.message
        );
    }

    // ==================================================
    // 13. FIND POSSIBLE FARMER SWITCHER
    // ==================================================

    const selectCount =
        await page.locator("select").count();

    const farmerInputs =
        await page.locator(
            'input, [role="combobox"]'
        ).count();

    result(
        "Potential farmer selector exists",
        selectCount > 0 || farmerInputs > 0
            ? "PASS"
            : "FAIL",
        `selects=${selectCount}, inputs/comboboxes=${farmerInputs}`
    );

    // ==================================================
    // 14. MOBILE LAYOUT
    // ==================================================

    await page.setViewportSize({
        width: 390,
        height: 844
    });

    await page.goto(FRONTEND, {
        waitUntil: "networkidle"
    });

    const bodyWidth =
        await page.evaluate(
            () => document.body.scrollWidth
        );

    const viewportWidth =
        await page.evaluate(
            () => window.innerWidth
        );

    const horizontalOverflow =
        bodyWidth > viewportWidth + 5;

    result(
        "Mobile layout has no horizontal overflow",
        horizontalOverflow ? "FAIL" : "PASS",
        `body=${bodyWidth}px viewport=${viewportWidth}px`
    );

    await screenshot(
        "workflow-06-mobile.png"
    );

    // ==================================================
    // 15. FINAL REPORT
    // ==================================================

    const report = {
        timestamp: new Date().toISOString(),
        farmer: FARMER,
        frontend: FRONTEND,
        backend: BACKEND,
        results,
        apiCalls,
        consoleErrors,
        failedRequests,
        originalDiaryCount: originalDiary.length,
        testDiaryId,
        testDiaryMarker: testNotes
    };

    fs.writeFileSync(
        "playwright-audit/workflow-report.json",
        JSON.stringify(
            report,
            null,
            2
        )
    );

    console.log("\n========================================");
    console.log(" WORKFLOW AUDIT COMPLETE");
    console.log("========================================\n");

    const passed =
        results.filter(
            r => r.status === "PASS"
        ).length;

    const failed =
        results.filter(
            r => r.status === "FAIL"
        ).length;

    console.log(
        `PASS: ${passed}`
    );

    console.log(
        `FAIL: ${failed}`
    );

    console.log(
        `Console errors: ${consoleErrors.length}`
    );

    console.log(
        `Failed requests: ${failedRequests.length}`
    );

    console.log(
        "\nReport:"
    );

    console.log(
        "playwright-audit/workflow-report.json"
    );

    console.log(
        "\nNOTE: A test diary entry was intentionally created."
    );

    console.log(
        `Marker: ${testNotes}`
    );

    console.log(
        "\nBrowser will remain open."
    );
})();