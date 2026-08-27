const { chromium } = require("playwright");
const fs = require("fs");

const FRONTEND = "http://localhost:5174";
const BACKEND = "http://localhost:8000";

(async () => {
    const browser = await chromium.launch({ headless: false });
    const page = await browser.newPage({
        viewport: { width: 1440, height: 900 }
    });

    const consoleErrors = [];
    const failedRequests = [];
    const badResponses = [];
    const actions = [];

    page.on("console", msg => {
        if (msg.type() === "error") {
            consoleErrors.push(msg.text());
        }
    });

    page.on("requestfailed", request => {
        failedRequests.push({
            method: request.method(),
            url: request.url(),
            failure: request.failure()?.errorText
        });
    });

    page.on("response", response => {
        if (response.status() >= 400) {
            badResponses.push({
                status: response.status(),
                method: response.request().method(),
                url: response.url()
            });
        }
    });

    function logAction(name, status, details = "") {
        actions.push({ name, status, details });
        console.log(`[${status}] ${name}${details ? " — " + details : ""}`);
    }

    console.log("\n========================================");
    console.log(" KISANSATHI-AI PLAYWRIGHT AUDIT");
    console.log("========================================\n");

    // --------------------------------------------------
    // 1. DASHBOARD
    // --------------------------------------------------

    await page.goto(FRONTEND, { waitUntil: "networkidle" });
    await page.screenshot({
        path: "playwright-audit/01-dashboard.png",
        fullPage: true
    });

    logAction(
        "Dashboard loads",
        "PASS",
        `Title: ${await page.title()}`
    );

    // --------------------------------------------------
    // 2. INVENTORY INTERACTIVE ELEMENTS
    // --------------------------------------------------

    const buttons = await page.locator("button").allTextContents();
    const links = await page.locator("a").allTextContents();

    fs.writeFileSync(
        "playwright-audit/interactive-elements.json",
        JSON.stringify(
            {
                buttons: buttons.map(x => x.trim()).filter(Boolean),
                links: links.map(x => x.trim()).filter(Boolean)
            },
            null,
            2
        )
    );

    console.log("\n--- BUTTONS ---");
    buttons.map(x => x.trim()).filter(Boolean).forEach(x => console.log("• " + x));

    console.log("\n--- LINKS ---");
    links.map(x => x.trim()).filter(Boolean).forEach(x => console.log("• " + x));

    // --------------------------------------------------
    // 3. CHECK IMPORTANT UI TEXT
    // --------------------------------------------------

    const expected = [
        "Farm Memory",
        "Live Weather",
        "Mandi",
        "AI",
        "Recommendation"
    ];

    for (const text of expected) {
        const found = await page.getByText(text, { exact: false }).count();

        logAction(
            `UI contains "${text}"`,
            found > 0 ? "PASS" : "FAIL"
        );
    }

    // --------------------------------------------------
    // 4. TEST FARMER PROFILE
    // --------------------------------------------------

    const profileCandidates = [
        "Farmer Profile",
        "Farmer Context",
        "Profile"
    ];

    let profileFound = false;

    for (const text of profileCandidates) {
        const locator = page.getByText(text, { exact: false }).first();

        if (await locator.count()) {
            try {
                await locator.click({ timeout: 3000 });
                await page.waitForTimeout(1000);

                logAction(
                    "Farmer profile interaction",
                    "PASS",
                    `Clicked "${text}"`
                );

                profileFound = true;
                await page.screenshot({
                    path: "playwright-audit/02-profile.png",
                    fullPage: true
                });

                break;
            } catch { }
        }
    }

    if (!profileFound) {
        logAction(
            "Farmer profile interaction",
            "FAIL",
            "No working profile interaction found"
        );
    }

    // Go back to dashboard
    await page.goto(FRONTEND, { waitUntil: "networkidle" });

    // --------------------------------------------------
    // 5. WEATHER
    // --------------------------------------------------

    const weatherText = page.getByText(
        "View 3-Day Forecast & Spraying Advisory",
        { exact: false }
    ).first();

    if (await weatherText.count()) {
        try {
            await weatherText.click({ timeout: 3000 });
            await page.waitForTimeout(800);

            logAction("Weather interaction", "PASS");

            await page.screenshot({
                path: "playwright-audit/03-weather.png",
                fullPage: true
            });
        } catch (e) {
            logAction("Weather interaction", "FAIL", e.message);
        }
    } else {
        logAction(
            "Weather interaction",
            "FAIL",
            "Forecast/advisory control not found"
        );
    }

    await page.goto(FRONTEND, { waitUntil: "networkidle" });

    // --------------------------------------------------
    // 6. MANDI
    // --------------------------------------------------

    const mandi = page.getByText(
        "Explore All Commodities & Selling Strategy",
        { exact: false }
    ).first();

    if (await mandi.count()) {
        try {
            await mandi.click({ timeout: 3000 });
            await page.waitForTimeout(800);

            logAction("Mandi navigation", "PASS");

            await page.screenshot({
                path: "playwright-audit/04-mandi.png",
                fullPage: true
            });
        } catch (e) {
            logAction("Mandi navigation", "FAIL", e.message);
        }
    } else {
        logAction(
            "Mandi navigation",
            "FAIL",
            "Mandi navigation control not found"
        );
    }

    await page.goto(FRONTEND, { waitUntil: "networkidle" });

    // --------------------------------------------------
    // 7. AI EXPLAINER
    // --------------------------------------------------

    const aiButtons = [
        "Explain Why",
        "Ask AI"
    ];

    let aiWorked = false;

    for (const text of aiButtons) {
        const locator = page.getByText(text, { exact: false }).first();

        if (await locator.count()) {
            try {
                await locator.click({ timeout: 3000 });
                await page.waitForTimeout(2000);

                logAction(
                    "AI explainer interaction",
                    "PASS",
                    `Clicked "${text}"`
                );

                aiWorked = true;

                await page.screenshot({
                    path: "playwright-audit/05-ai.png",
                    fullPage: true
                });

                break;
            } catch { }
        }
    }

    if (!aiWorked) {
        logAction(
            "AI explainer interaction",
            "FAIL",
            "AI button/modal did not work"
        );
    }

    await page.goto(FRONTEND, { waitUntil: "networkidle" });

    // --------------------------------------------------
    // 8. DIARY
    // --------------------------------------------------

    const diaryText = page.getByText(
        "View Full Farm Timeline & Diary History",
        { exact: false }
    ).first();

    if (await diaryText.count()) {
        try {
            await diaryText.click({ timeout: 3000 });
            await page.waitForTimeout(800);

            logAction("Full diary navigation", "PASS");

            await page.screenshot({
                path: "playwright-audit/06-diary.png",
                fullPage: true
            });
        } catch (e) {
            logAction("Full diary navigation", "FAIL", e.message);
        }
    } else {
        logAction(
            "Full diary navigation",
            "FAIL",
            "Diary navigation control not found"
        );
    }

    await page.goto(FRONTEND, { waitUntil: "networkidle" });

    // --------------------------------------------------
    // 9. ADD ENTRY — ONLY OPEN FORM, DON'T SUBMIT
    // --------------------------------------------------

    const addEntry = page.getByText(
        "Add Entry",
        { exact: true }
    ).first();

    if (await addEntry.count()) {
        try {
            await addEntry.click({ timeout: 3000 });
            await page.waitForTimeout(500);

            logAction(
                "Add Diary Entry opens",
                "PASS"
            );

            await page.screenshot({
                path: "playwright-audit/07-add-entry.png",
                fullPage: true
            });
        } catch (e) {
            logAction(
                "Add Diary Entry opens",
                "FAIL",
                e.message
            );
        }
    } else {
        logAction(
            "Add Diary Entry opens",
            "FAIL",
            "Add Entry button not found"
        );
    }

    await page.goto(FRONTEND, { waitUntil: "networkidle" });

    // --------------------------------------------------
    // 10. ACKNOWLEDGE / POSTPONE
    // --------------------------------------------------

    const postpone = page.getByText(
        "Acknowledge & Postpone",
        { exact: false }
    ).first();

    if (await postpone.count()) {
        console.log(
            "\n[ACTION NOT EXECUTED] Acknowledge & Postpone found."
        );
        console.log(
            "This audit does NOT click it automatically because it changes persistent data."
        );

        logAction(
            "Acknowledge & Postpone button exists",
            "PASS",
            "Manual persistence test required"
        );
    } else {
        logAction(
            "Acknowledge & Postpone button exists",
            "FAIL"
        );
    }

    // --------------------------------------------------
    // 11. BACKEND HEALTH
    // --------------------------------------------------

    try {
        const response = await page.request.get(
            `${BACKEND}/api/health`
        );

        logAction(
            "Backend health",
            response.status() === 200 ? "PASS" : "FAIL",
            `HTTP ${response.status()}`
        );
    } catch (e) {
        logAction(
            "Backend health",
            "FAIL",
            e.message
        );
    }

    // --------------------------------------------------
    // 12. FINAL REPORT
    // --------------------------------------------------

    const report = {
        timestamp: new Date().toISOString(),
        frontend: FRONTEND,
        backend: BACKEND,
        actions,
        consoleErrors,
        failedRequests,
        badResponses,
        interactiveElements: {
            buttons,
            links
        }
    };

    fs.writeFileSync(
        "playwright-audit/report.json",
        JSON.stringify(report, null, 2)
    );

    console.log("\n========================================");
    console.log(" AUDIT COMPLETE");
    console.log("========================================");

    console.log(`\nActions tested: ${actions.length}`);
    console.log(`Console errors: ${consoleErrors.length}`);
    console.log(`Failed requests: ${failedRequests.length}`);
    console.log(`HTTP 4xx/5xx: ${badResponses.length}`);

    console.log("\nResults:");

    for (const action of actions) {
        console.log(
            `${action.status.padEnd(6)} | ${action.name}`
        );
    }

    console.log(
        "\nFiles generated inside playwright-audit/"
    );

    console.log(
        "  report.json"
    );

    console.log(
        "  interactive-elements.json"
    );

    console.log(
        "  screenshots"
    );

    console.log("\nBrowser will remain open for manual inspection.");
})();