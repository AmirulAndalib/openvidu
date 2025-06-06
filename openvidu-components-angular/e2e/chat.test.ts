import { Builder, WebDriver } from 'selenium-webdriver';
import { TestAppConfig } from './selenium.conf';
import { OpenViduComponentsPO } from './utils.po.test';

const url = TestAppConfig.appUrl;

describe('Testing CHAT features', () => {
	let browser: WebDriver;
	let utils: OpenViduComponentsPO;

	async function createChromeBrowser(): Promise<WebDriver> {
		return await new Builder()
			.forBrowser(TestAppConfig.browserName)
			.withCapabilities(TestAppConfig.browserCapabilities)
			.setChromeOptions(TestAppConfig.browserOptions)
			.usingServer(TestAppConfig.seleniumAddress)
			.build();
	}

	beforeEach(async () => {
		browser = await createChromeBrowser();
		utils = new OpenViduComponentsPO(browser);
	});

	afterEach(async () => {
		try {
			// leaving room if connected
			await utils.leaveRoom();
		} catch (error) {}
		await browser.quit();
	});

	it('should send messages', async () => {
		await browser.get(`${url}&prejoin=false`);

		await utils.checkLayoutPresent();

		await utils.togglePanel('chat');
		await browser.sleep(500);

		await utils.waitForElement('.sidenav-menu');
		await utils.waitForElement('.input-container');
		expect(await utils.isPresent('.input-container')).toBeTrue();

		const input = await utils.waitForElement('#chat-input');
		await input.sendKeys('Test message');

		await utils.clickOn('#send-btn');

		await utils.waitForElement('.message');
		await utils.getNumberOfElements('.message');
		expect(await utils.isPresent('.message')).toBeTrue();

		expect(await utils.getNumberOfElements('.message')).toEqual(1);

		await input.sendKeys('Test message');
		await utils.clickOn('#send-btn');
		expect(await utils.getNumberOfElements('.message')).toEqual(2);
	});

	it('should receive a message', async () => {
		const roomName = 'chattingE2E';
		let pName = `participant${Math.floor(Math.random() * 1000)}`;
		const fixedUrl = `${url}&prejoin=false&roomName=${roomName}`;
		await browser.get(fixedUrl);
		await browser.sleep(1000);
		await utils.checkLayoutPresent();

		// Starting new browser for adding a new participant
		const newTabScript = `window.open("${fixedUrl}&participantName=${pName}")`;
		await browser.executeScript(newTabScript);
		const tabs = await browser.getAllWindowHandles();
		browser.switchTo().window(tabs[1]);

		await utils.checkLayoutPresent();

		await utils.togglePanel('chat');
		await browser.sleep(1000);

		await utils.waitForElement('.sidenav-menu');
		await utils.waitForElement('.input-container');
		expect(await utils.isPresent('.input-container')).toBeTrue();

		const input = await utils.waitForElement('#chat-input');
		await input.sendKeys('test message');
		await utils.clickOn('#send-btn');

		// Go to first tab
		browser.switchTo().window(tabs[0]);

		await utils.waitForElement('.snackbarNotification');
		await utils.togglePanel('chat');
		await browser.sleep(1000);
		await utils.waitForElement('.message');
		const participantName = await utils.waitForElement('.participant-name-container>p');
		expect(await utils.getNumberOfElements('.message')).toEqual(1);
		expect(await participantName.getText()).toEqual(pName);
	});

	it('should send an url message and converts in a link', async () => {
		await browser.get(`${url}&prejoin=false`);

		await utils.checkLayoutPresent();

		await utils.togglePanel('chat');
		await browser.sleep(500);

		await utils.waitForElement('.sidenav-menu');
		await utils.waitForElement('.input-container');
		expect(await utils.isPresent('.input-container')).toBeTrue();

		const input = await utils.waitForElement('#chat-input');
		await input.sendKeys('demos.openvidu.io');

		await utils.clickOn('#send-btn');

		await utils.waitForElement('.chat-message a');
		expect(await utils.isPresent('.chat-message a')).toBeTrue();
	});
});
