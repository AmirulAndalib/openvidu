import { expect } from 'chai';
import { Builder, ILocation, IRectangle, ISize, WebDriver } from 'selenium-webdriver';
import { OPENVIDU_CALL_SERVER } from '../config';
import { WebComponentConfig } from '../selenium.conf';
import { OpenViduComponentsPO } from '../utils.po.test';

const url = `${WebComponentConfig.appUrl}?OV_URL=${OPENVIDU_CALL_SERVER}`;

describe('Checking stream elements by disabling/enabling the media', () => {
	let browser: WebDriver;
	let utils: OpenViduComponentsPO;
	async function createChromeBrowser(): Promise<WebDriver> {
		return await new Builder()
			.forBrowser(WebComponentConfig.browserName)
			.withCapabilities(WebComponentConfig.browserCapabilities)
			.setChromeOptions(WebComponentConfig.browserOptions)
			.usingServer(WebComponentConfig.seleniumAddress)
			.build();
	}

	beforeEach(async () => {
		browser = await createChromeBrowser();
		utils = new OpenViduComponentsPO(browser);
	});

	afterEach(async () => {
		await browser.quit();
	});

	it('should show 0 video element when a participant joins with video disabled', async () => {
		await browser.get(`${url}&prejoin=true&videoEnabled=false`);

		await utils.checkPrejoinIsPresent();
		await utils.clickOn('#join-button');
		await utils.checkLayoutPresent();
		await utils.waitForElement('.OV_stream.local');

		expect(await utils.getNumberOfElements('.OV_stream')).equal(1);
		expect(await utils.getNumberOfElements('video')).equal(0);
		expect(await utils.getNumberOfElements('audio')).equal(1);
	});

	it('should show a video element when a participant joins with audio muted', async () => {
		await browser.get(`${url}&prejoin=true&audioEnabled=false`);

		await utils.checkPrejoinIsPresent();
		await utils.clickOn('#join-button');
		await utils.checkLayoutPresent();
		await utils.waitForElement('.OV_stream.local');

		expect(await utils.getNumberOfElements('.OV_stream')).equal(1);
		expect(await utils.getNumberOfElements('video')).equal(1);
		expect(await utils.getNumberOfElements('audio')).equal(0);
	});

	it('should show a video element when a participant joins', async () => {
		await browser.get(`${url}&prejoin=true&videoEnabled=true&audioEnabled=true`);

		await utils.checkPrejoinIsPresent();
		await utils.clickOn('#join-button');
		await utils.checkLayoutPresent();
		await utils.waitForElement('.OV_stream.local');

		expect(await utils.getNumberOfElements('.OV_stream')).equal(1);
		expect(await utils.getNumberOfElements('video')).equal(1);
		expect(await utils.getNumberOfElements('audio')).equal(1);
	});

	it('should show a video element when a participant shares its screen with VIDEO and AUDIO MUTED', async () => {
		await browser.get(`${url}&prejoin=true&videoEnabled=false&audioEnabled=false`);

		await utils.checkPrejoinIsPresent();
		await utils.clickOn('#join-button');
		await utils.checkLayoutPresent();
		await utils.waitForElement('.OV_stream.local');

		expect(await utils.getNumberOfElements('.OV_stream')).equal(1);
		expect(await utils.getNumberOfElements('video')).equal(0);
		expect(await utils.getNumberOfElements('audio')).equal(0);

		await utils.clickOn('#screenshare-btn');
		await browser.sleep(1000);
		await utils.waitForElement('#local-element-screen_share');
		expect(await utils.getNumberOfElements('.OV_stream')).equal(2);
		expect(await utils.getNumberOfElements('video')).equal(1); //screen sharse video
		expect(await utils.getNumberOfElements('audio')).equal(1); //screen share audio

		await utils.disableScreenShare();
		expect(await utils.getNumberOfElements('.OV_stream')).equal(1);
		expect(await utils.getNumberOfElements('video')).equal(0);
		expect(await utils.getNumberOfElements('audio')).equal(0);
	});

	it('should show a video element when a LOCAL participant shares its screen', async () => {
		await browser.get(`${url}&prejoin=true&videoEnabled=true&audioEnabled=true`);

		await utils.checkPrejoinIsPresent();
		await utils.clickOn('#join-button');
		await utils.checkLayoutPresent();
		await utils.waitForElement('.OV_stream.local');

		expect(await utils.getNumberOfElements('.OV_stream')).equal(1);
		expect(await utils.getNumberOfElements('video')).equal(1);
		expect(await utils.getNumberOfElements('audio')).equal(1);

		await utils.clickOn('#screenshare-btn');
		await browser.sleep(1000);
		await utils.waitForElement('#local-element-screen_share');
		expect(await utils.getNumberOfElements('.OV_stream')).equal(2);
		expect(await utils.getNumberOfElements('video')).equal(2);
		expect(await utils.getNumberOfElements('audio')).equal(2); //screen share audio and local audio

		await utils.disableScreenShare();
		expect(await utils.getNumberOfElements('.OV_stream')).equal(1);
		expect(await utils.getNumberOfElements('video')).equal(1);
		expect(await utils.getNumberOfElements('audio')).equal(1);
	});

	/* ------------ Checking video elements with two participants ------------ */

	it('should show zero video elements when two participants join with VIDEO and AUDIO MUTED', async () => {
		const roomName = `streams-${Date.now()}`;
		const fixedUrl = `${url}&roomName=${roomName}&prejoin=false&videoEnabled=false&audioEnabled=false`;
		await browser.get(fixedUrl);

		await utils.checkLayoutPresent();
		await utils.waitForElement('.OV_stream.local');

		expect(await utils.getNumberOfElements('.OV_stream')).equal(1);
		expect(await utils.getNumberOfElements('video')).equal(0);
		expect(await utils.getNumberOfElements('audio')).equal(0);

		const tabs = await utils.openTab(fixedUrl);
		await browser.switchTo().window(tabs[0]);

		await browser.sleep(1000);
		await utils.waitForElement('.OV_stream.remote');
		expect(await utils.getNumberOfElements('.OV_stream')).equal(2);
		expect(await utils.getNumberOfElements('video')).equal(0);
		expect(await utils.getNumberOfElements('audio')).equal(0);

		await browser.switchTo().window(tabs[1]);
		await browser.sleep(1000);
		expect(await utils.getNumberOfElements('.OV_stream')).equal(2);
		expect(await utils.getNumberOfElements('video')).equal(0);
		expect(await utils.getNumberOfElements('audio')).equal(0);
	});

	it('should show two video elements when a two participants join with audio muted', async () => {
		const roomName = `streams-${Date.now()}`;
		const fixedUrl = `${url}&roomName=${roomName}&prejoin=false&videoEnabled=true&audioEnabled=false`;
		await browser.get(fixedUrl);

		await utils.checkLayoutPresent();
		await utils.waitForElement('.OV_stream.local');

		expect(await utils.getNumberOfElements('.OV_stream')).equal(1);
		expect(await utils.getNumberOfElements('video')).equal(1);
		expect(await utils.getNumberOfElements('audio')).equal(0);

		const tabs = await utils.openTab(fixedUrl);
		await browser.switchTo().window(tabs[0]);

		await utils.waitForElement('.OV_stream.remote');
		await browser.sleep(2000);
		expect(await utils.getNumberOfElements('.OV_stream')).equal(2);
		expect(await utils.getNumberOfElements('video')).equal(2);
		expect(await utils.getNumberOfElements('audio')).equal(0);

		await browser.switchTo().window(tabs[1]);
		await browser.sleep(1000);
		expect(await utils.getNumberOfElements('.OV_stream')).equal(2);
		expect(await utils.getNumberOfElements('video')).equal(2);
		expect(await utils.getNumberOfElements('audio')).equal(0);
	});

	it('should show zero video elements when two participants join with video disabled', async () => {
		const roomName = `streams-${Date.now()}`;
		const fixedUrl = `${url}&roomName=${roomName}&prejoin=false&videoEnabled=false`;
		await browser.get(fixedUrl);

		await utils.checkLayoutPresent();
		await utils.waitForElement('.OV_stream.local');

		expect(await utils.getNumberOfElements('.OV_stream')).equal(1);
		expect(await utils.getNumberOfElements('video')).equal(0);
		expect(await utils.getNumberOfElements('audio')).equal(1);

		const tabs = await utils.openTab(fixedUrl);
		await browser.switchTo().window(tabs[0]);

		await utils.waitForElement('.OV_stream.remote');
		await browser.sleep(2000);
		expect(await utils.getNumberOfElements('.OV_stream')).equal(2);
		expect(await utils.getNumberOfElements('video')).equal(0);
		expect(await utils.getNumberOfElements('audio')).equal(2);

		await browser.switchTo().window(tabs[1]);
		await browser.sleep(1000);
		expect(await utils.getNumberOfElements('.OV_stream')).equal(2);
		expect(await utils.getNumberOfElements('video')).equal(0);
		expect(await utils.getNumberOfElements('audio')).equal(2);
	});

	it('should show 3 video elements when a participant shares its screen with AUDIO and VIDEO MUTED', async () => {
		const roomName = `streams-${Date.now()}`;
		const fixedUrl = `${url}&roomName=${roomName}&prejoin=false&videoEnabled=false&audioEnabled=false`;
		await browser.get(fixedUrl);

		await utils.checkLayoutPresent();
		await utils.waitForElement('.OV_stream.local');

		const tabs = await utils.openTab(fixedUrl);
		await browser.switchTo().window(tabs[1]);

		await utils.waitForElement('.OV_stream.local');

		await utils.clickOn('#screenshare-btn');
		await browser.sleep(1000);
		await utils.waitForElement('#local-element-screen_share');
		expect(await utils.getNumberOfElements('.OV_stream')).equal(3);
		expect(await utils.getNumberOfElements('video')).equal(1);
		expect(await utils.getNumberOfElements('audio')).equal(1); // screen share audios

		await browser.switchTo().window(tabs[0]);
		await browser.sleep(1000);
		expect(await utils.getNumberOfElements('.OV_stream')).equal(3);
		expect(await utils.getNumberOfElements('video')).equal(1);
		expect(await utils.getNumberOfElements('audio')).equal(1); // screen share audios

		await browser.switchTo().window(tabs[1]);
		await utils.disableScreenShare();
		expect(await utils.getNumberOfElements('.OV_stream')).equal(2);
		expect(await utils.getNumberOfElements('video')).equal(0);
		expect(await utils.getNumberOfElements('audio')).equal(0);

		await browser.switchTo().window(tabs[0]);
		await browser.sleep(500);
		expect(await utils.getNumberOfElements('.OV_stream')).equal(2);
		expect(await utils.getNumberOfElements('video')).equal(0);
		expect(await utils.getNumberOfElements('audio')).equal(0);
	});

	it('should show 3 video elements when a REMOTE participant shares its screen', async () => {
		const roomName = `streams-${Date.now()}`;
		const fixedUrl = `${url}&roomName=${roomName}&prejoin=false&videoEnabled=true&audioEnabled=true`;
		await browser.get(fixedUrl);

		await utils.checkLayoutPresent();
		await utils.waitForElement('.OV_stream.local');

		const tabs = await utils.openTab(fixedUrl);
		await browser.switchTo().window(tabs[1]);

		await utils.waitForElement('.OV_stream.local');

		await utils.clickOn('#screenshare-btn');
		await browser.sleep(1000);
		await utils.waitForElement('#local-element-screen_share');
		expect(await utils.getNumberOfElements('.OV_stream')).equal(3);
		expect(await utils.getNumberOfElements('video')).equal(3);
		expect(await utils.getNumberOfElements('audio')).equal(3); // screen share audios and local audio and remote audio

		await browser.switchTo().window(tabs[0]);
		await browser.sleep(1000);
		expect(await utils.getNumberOfElements('.OV_stream')).equal(3);
		expect(await utils.getNumberOfElements('video')).equal(3);
		expect(await utils.getNumberOfElements('audio')).equal(3); // screen share audios and local audio and remote audio

		await browser.switchTo().window(tabs[1]);
		await utils.disableScreenShare();
		expect(await utils.getNumberOfElements('.OV_stream')).equal(2);
		expect(await utils.getNumberOfElements('video')).equal(2);
		expect(await utils.getNumberOfElements('audio')).equal(2);

		await browser.switchTo().window(tabs[0]);
		await browser.sleep(500);
		expect(await utils.getNumberOfElements('.OV_stream')).equal(2);
		expect(await utils.getNumberOfElements('video')).equal(2);
		expect(await utils.getNumberOfElements('audio')).equal(2);
	});

	it('should show 4 video elements when a two participants share theirs screen', async () => {
		const roomName = `streams-${Date.now()}`;
		const fixedUrl = `${url}&roomName=${roomName}&prejoin=false&videoEnabled=false&audioEnabled=false`;
		await browser.get(fixedUrl);

		await utils.checkLayoutPresent();
		await utils.waitForElement('.OV_stream.local');
		await utils.clickOn('#screenshare-btn');
		await browser.sleep(500);

		const tabs = await utils.openTab(fixedUrl);
		await browser.switchTo().window(tabs[1]);

		await utils.waitForElement('.OV_stream.local');
		expect(await utils.getNumberOfElements('.OV_stream')).equal(3);
		expect(await utils.getNumberOfElements('video')).equal(1);
		expect(await utils.getNumberOfElements('audio')).equal(1); // screen share audios

		await utils.clickOn('#screenshare-btn');
		await browser.sleep(500);
		await utils.waitForElement('#local-element-screen_share');
		expect(await utils.getNumberOfElements('.OV_stream')).equal(4);
		expect(await utils.getNumberOfElements('video')).equal(2);
		expect(await utils.getNumberOfElements('audio')).equal(2); // screen share audios

		await browser.switchTo().window(tabs[0]);
		await browser.sleep(500);
		expect(await utils.getNumberOfElements('.OV_stream')).equal(4);
		expect(await utils.getNumberOfElements('video')).equal(2);
		expect(await utils.getNumberOfElements('audio')).equal(2); // screen share audios

		await utils.disableScreenShare();
		expect(await utils.getNumberOfElements('.OV_stream')).equal(3);
		expect(await utils.getNumberOfElements('video')).equal(1);
		expect(await utils.getNumberOfElements('audio')).equal(1); // screen share audios

		await browser.switchTo().window(tabs[1]);
		await browser.sleep(500);
		expect(await utils.getNumberOfElements('.OV_stream')).equal(3);
		expect(await utils.getNumberOfElements('video')).equal(1);
		expect(await utils.getNumberOfElements('audio')).equal(1); // screen share audios
	});
});

describe('Testing stream features', () => {
	let browser: WebDriver;
	let utils: OpenViduComponentsPO;
	async function createChromeBrowser(): Promise<WebDriver> {
		return await new Builder()
			.forBrowser(WebComponentConfig.browserName)
			.withCapabilities(WebComponentConfig.browserCapabilities)
			.setChromeOptions(WebComponentConfig.browserOptions)
			.usingServer(WebComponentConfig.seleniumAddress)
			.build();
	}

	beforeEach(async () => {
		browser = await createChromeBrowser();
		utils = new OpenViduComponentsPO(browser);
	});

	afterEach(async () => {
		await browser.quit();
	});

	it('should show the PIN button over the LOCAL video', async () => {
		await browser.get(`${url}&prejoin=false`);

		await utils.checkLayoutPresent();
		await utils.waitForElement('.OV_stream.local');
		await utils.hoverOn('.OV_stream.local');
		await utils.waitForElement('#pin-btn');
		expect(await utils.isPresent('#pin-btn')).to.be.true;
	});

	it('should show the PIN button over the REMOTE video', async () => {
		const roomName = 'pinE2E';
		const fixedUrl = `${url}&roomName=${roomName}&prejoin=false`;
		await browser.get(fixedUrl);

		await utils.checkLayoutPresent();

		// Starting new browser for adding the second participant
		const newTabScript = `window.open("${fixedUrl}")`;
		await browser.executeScript(newTabScript);
		const tabs = await browser.getAllWindowHandles();
		await browser.switchTo().window(tabs[1]);

		await utils.checkLayoutPresent();
		await utils.waitForElement('.OV_stream.local');
		await utils.waitForElement('.OV_stream.remote');
		await utils.hoverOn('.OV_stream.remote');
		await utils.waitForElement('#pin-btn');
		expect(await utils.isPresent('#pin-btn')).to.be.true;
	});

	it('should show the SILENCE button ONLY over the REMOTE video', async () => {
		const roomName = 'silenceE2E';
		const fixedUrl = `${url}&roomName=${roomName}&prejoin=false`;
		await browser.get(fixedUrl);

		await utils.checkLayoutPresent();
		await utils.waitForElement('.OV_stream.local');
		await utils.hoverOn('.OV_stream.local');
		await browser.sleep(500);

		expect(await utils.getNumberOfElements('.OV_stream.local #silence-btn')).equals(0);

		// Starting new browser for adding the second participant
		const newTabScript = `window.open("${fixedUrl}")`;
		await browser.executeScript(newTabScript);
		const tabs = await browser.getAllWindowHandles();
		await browser.switchTo().window(tabs[1]);

		await utils.checkLayoutPresent();
		await utils.waitForElement('.OV_stream.remote');
		await utils.hoverOn('.OV_stream.remote');
		await utils.waitForElement('.OV_stream.remote #silence-btn');
		expect(await utils.isPresent('.OV_stream.remote #silence-btn')).to.be.true;
		expect(await utils.getNumberOfElements('.OV_stream.remote #silence-btn')).equals(1);

		await utils.hoverOn('.OV_stream.local');
		await browser.sleep(500);

		expect(await utils.getNumberOfElements('.OV_stream.local #silence-btn')).equals(0);
	});

	it('should show the MINIMIZE button ONLY over the LOCAL video', async () => {
		const roomName = 'minimizeE2E';
		const fixedUrl = `${url}&roomName=${roomName}&prejoin=false`;
		await browser.get(fixedUrl);
		await utils.checkLayoutPresent();
		await utils.waitForElement('.OV_stream.local');
		await utils.hoverOn('.OV_stream.local');
		await utils.waitForElement('#minimize-btn');
		expect(await utils.isPresent('#minimize-btn')).to.be.true;

		// Starting new browser for adding the second participant
		const newTabScript = `window.open("${fixedUrl}")`;
		await browser.executeScript(newTabScript);
		const tabs = await browser.getAllWindowHandles();
		await browser.switchTo().window(tabs[1]);

		await utils.checkLayoutPresent();
		await utils.waitForElement('.OV_stream.local');
		await utils.hoverOn('.OV_stream.remote');
		expect(await utils.getNumberOfElements('#minimize-btn')).equals(0);

		await utils.hoverOn('.OV_stream.local');
		await utils.waitForElement('#minimize-btn');
		expect(await utils.isPresent('#minimize-btn')).to.be.true;
	});

	it('should minimize the LOCAL video', async () => {
		await browser.get(`${url}&prejoin=false`);

		await utils.checkLayoutPresent();

		const stream = await utils.waitForElement('.OV_stream.local');
		const streamProps: IRectangle = await stream.getRect();

		await utils.hoverOn('.OV_stream.local');
		await utils.waitForElement('#minimize-btn');
		await utils.clickOn('#minimize-btn');
		await browser.sleep(900);
		const minimizeStream = await utils.waitForElement('.OV_stream.local');
		const minimizeStreamProps: IRectangle = await minimizeStream.getRect();
		expect(streamProps.height).not.equals(minimizeStreamProps.height);
		expect(streamProps.width).not.equals(minimizeStreamProps.width);
		expect(minimizeStreamProps.x).lessThan(100);
		expect(minimizeStreamProps.y).lessThan(100);
	});

	it('should MAXIMIZE the local video', async () => {
		await browser.get(`${url}&prejoin=false&audioEnabled=false`);
		const marginX = 5;

		await utils.checkLayoutPresent();
		await utils.subscribeToDropEvent();

		await utils.waitForElement('.OV_stream.local');
		await utils.hoverOn('.OV_stream.local');
		await utils.waitForElement('#minimize-btn');
		await utils.clickOn('#minimize-btn');

		await browser.sleep(500);
		await utils.dragToRight(300, 300);
		await browser.sleep(500);

		let stream = await utils.waitForElement('.OV_stream.local');
		let streamProps: IRectangle = await stream.getRect();
		expect(streamProps.x).equals(300 + marginX);
		expect(streamProps.y).equals(300);

		await utils.hoverOn('.OV_stream.local');
		await utils.waitForElement('#minimize-btn');
		await utils.clickOn('#minimize-btn');
		await browser.sleep(1500);

		stream = await utils.waitForElement('.OV_stream.local');
		streamProps = await stream.getRect();
		expect(streamProps.x).lessThan(300 + marginX);
		expect(streamProps.y).equals(1); //.OV_publisher element has 1px of padding
	});

	it('should be able to dragg the minimized LOCAL video', async () => {
		await browser.get(`${url}&prejoin=false&audioEnabled=false`);
		const marginX = 5;

		await utils.checkLayoutPresent();
		await utils.subscribeToDropEvent();

		await utils.waitForElement('.OV_stream.local');
		await utils.hoverOn('.OV_stream.local');
		await utils.waitForElement('#minimize-btn');
		await utils.clickOn('#minimize-btn');

		await browser.sleep(500);
		await utils.dragToRight(300, 300);
		await browser.sleep(500);

		const stream = await utils.waitForElement('.OV_stream.local');
		const streamProps: IRectangle = await stream.getRect();
		expect(streamProps.x).equals(300 + marginX);
		expect(streamProps.y).equals(300);
	});

	it('should be the MINIMIZED video ALWAYS VISIBLE when toggling panels', async () => {
		await browser.get(`${url}&prejoin=false&audioEnabled=false`);
		const marginX = 5;

		await utils.checkLayoutPresent();
		await utils.subscribeToDropEvent();

		// Minimize stream element
		await utils.waitForElement('.OV_stream.local');
		await utils.hoverOn('.OV_stream.local');
		await utils.waitForElement('#minimize-btn');
		await utils.clickOn('#minimize-btn');

		await browser.sleep(500);
		await utils.dragToRight(900, 0);
		await browser.sleep(500);

		let stream = await utils.waitForElement('.OV_stream.local');
		let streamProps: IRectangle = await stream.getRect();
		expect(streamProps.x).equals(900 + marginX);
		expect(streamProps.y).equals(0);

		// Open chat panel
		await utils.clickOn('#chat-panel-btn');
		await browser.sleep(1000);
		stream = await utils.waitForElement('.OV_stream.local');
		streamProps = await stream.getRect();
		let lastX = streamProps.x;

		expect(streamProps.x).lessThan(900 + marginX);
		expect(streamProps.y).equals(0);

		// Close chat panel
		await utils.clickOn('#chat-panel-btn');
		await browser.sleep(1000);

		stream = await utils.waitForElement('.OV_stream.local');
		streamProps = await stream.getRect();

		expect(streamProps.x).greaterThan(lastX + marginX);
		expect(streamProps.y).equals(0);
	});

	it('should be the MINIMIZED video go to the right when panel closes', async () => {
		await browser.get(`${url}&prejoin=false&audioEnabled=false`);
		const waitTimeout = 1000;
		const marginX = 5;
		const newX = 641 - marginX;

		await utils.checkLayoutPresent();
		await utils.subscribeToDropEvent();

		// Open chat panel
		await utils.waitForElement('.OV_stream.local');
		await utils.waitForElement('#chat-panel-btn');
		await utils.clickOn('#chat-panel-btn');

		// Minimize stream element
		await browser.sleep(waitTimeout);
		await utils.hoverOn('.OV_stream.local');
		await utils.waitForElement('#minimize-btn');
		await utils.clickOn('#minimize-btn');

		await browser.sleep(waitTimeout);
		await utils.dragToRight(newX, 0);
		await browser.sleep(waitTimeout);

		let stream = await utils.waitForElement('.OV_stream.local');
		let streamProps: IRectangle = await stream.getRect();
		expect(streamProps.x).equals(newX + marginX);
		expect(streamProps.y).equals(0);

		// Close chat panel
		// There is a unstable behaviour simulating the drag and drop with selenium (the stream is not moved the first time)
		// So we are going to open and close the chat panel two times to ensure the stream is moved
		await utils.clickOn('#chat-panel-btn');
		await browser.sleep(waitTimeout);
		await utils.clickOn('#chat-panel-btn');
		await browser.sleep(waitTimeout);
		await utils.clickOn('#chat-panel-btn');
		await browser.sleep(1000);
		stream = await utils.waitForElement('.OV_stream.local');
		streamProps = await stream.getRect();
		let lastX = streamProps.x;

		expect(streamProps.x).greaterThanOrEqual(newX + marginX);
		expect(streamProps.y).equals(0);

		// Open chat panel
		await utils.clickOn('#chat-panel-btn');
		await browser.sleep(waitTimeout);

		stream = await utils.waitForElement('.OV_stream.local');
		streamProps = await stream.getRect();

		expect(streamProps.x).lessThan(lastX + marginX);
		expect(streamProps.y).equals(0);
	});

	it('should be the MINIMIZED video ALWAYS VISIBLE when toggling from small to bigger panel', async () => {
		await browser.get(`${url}&prejoin=false&audioEnabled=false`);
		const marginX = 5;

		await utils.checkLayoutPresent();
		await utils.subscribeToDropEvent();

		// Minimize stream element
		await utils.waitForElement('.OV_stream.local');
		await utils.hoverOn('.OV_stream.local');
		await utils.waitForElement('#minimize-btn');
		await utils.clickOn('#minimize-btn');

		await browser.sleep(500);
		await utils.dragToRight(900, 0);
		await browser.sleep(500);

		let stream = await utils.waitForElement('.OV_stream.local');
		let streamProps: IRectangle = await stream.getRect();
		expect(streamProps.x).equals(900 + marginX);
		expect(streamProps.y).equals(0);

		// Open chat panel
		await utils.clickOn('#chat-panel-btn');
		await browser.sleep(1000);
		stream = await utils.waitForElement('.OV_stream.local');
		streamProps = await stream.getRect();
		let lastX = streamProps.x;

		expect(streamProps.x).lessThan(900 + marginX);
		expect(streamProps.y).equals(0);

		// Open settings panel
		await utils.togglePanel('settings');
		await browser.sleep(1000);

		stream = await utils.waitForElement('.OV_stream.local');
		streamProps = await stream.getRect();

		expect(streamProps.x).lessThan(lastX + marginX);
		expect(streamProps.y).equals(0);
		lastX = streamProps.x;

		// Open chat panel
		await utils.clickOn('#chat-panel-btn');
		await browser.sleep(1000);
		stream = await utils.waitForElement('.OV_stream.local');
		streamProps = await stream.getRect();

		expect(streamProps.x).greaterThan(lastX + marginX);
		expect(streamProps.y).equals(0);
	});

	it.skip('should show the audio detection elements when participant is speaking', async () => {
		const roomName = 'speakingE2E';
		const fixedUrl = `${url}&roomName=${roomName}&prejoin=false`;
		await browser.get(`${fixedUrl}&audioEnabled=false`);

		await utils.checkLayoutPresent();

		// Starting new browser for adding the second participant
		const newTabScript = `window.open("${fixedUrl}")`;
		await browser.executeScript(newTabScript);
		const tabs = await browser.getAllWindowHandles();
		await browser.switchTo().window(tabs[0]);

		await utils.waitForElement('.OV_stream.remote.speaking');
		expect(await utils.getNumberOfElements('.OV_stream.remote.speaking')).to.be.equal(1);
		expect(await utils.getNumberOfElements('.OV_stream.speaking')).to.be.equal(1);
	});
});

describe('Testing video is playing', () => {
	let browser: WebDriver;
	let utils: OpenViduComponentsPO;

	async function createChromeBrowser(): Promise<WebDriver> {
		return await new Builder()
			.forBrowser(WebComponentConfig.browserName)
			.withCapabilities(WebComponentConfig.browserCapabilities)
			.setChromeOptions(WebComponentConfig.browserOptions)
			.usingServer(WebComponentConfig.seleniumAddress)
			.build();
	}

	beforeEach(async () => {
		browser = await createChromeBrowser();
		utils = new OpenViduComponentsPO(browser);
	});

	afterEach(async () => {
		await browser.quit();
	});

	it('should play the participant video with only audio', async () => {
		const roomName = 'audioOnlyE2E';
		const fixedUrl = `${url}&roomName=${roomName}`;
		await browser.get(fixedUrl);

		await utils.checkPrejoinIsPresent();
		await utils.clickOn('#join-button');

		// Starting new browser for adding the second participant
		const newTabScript = `window.open("${fixedUrl}")`;
		await browser.executeScript(newTabScript);
		const tabs = await browser.getAllWindowHandles();
		await browser.switchTo().window(tabs[1]);

		await utils.checkPrejoinIsPresent();
		await utils.clickOn('#camera-button');
		await utils.clickOn('#join-button');

		// Go to first tab
		await browser.switchTo().window(tabs[0]);

		// Wait until NO_STREAM_PLAYING_EVENT exception timeout is reached
		await browser.sleep(6000);

		const exceptionQuantity = await utils.getNumberOfElements('#NO_STREAM_PLAYING_EVENT');
		expect(exceptionQuantity).equals(0);
	});

	it('should play the participant video with only video', async () => {
		const roomName = 'videoOnlyE2E';
		const fixedUrl = `${url}&roomName=${roomName}`;
		await browser.get(fixedUrl);

		await utils.checkPrejoinIsPresent();
		await utils.clickOn('#join-button');

		// Starting new browser for adding the second participant
		const newTabScript = `window.open("${fixedUrl}")`;
		await browser.executeScript(newTabScript);
		const tabs = await browser.getAllWindowHandles();
		await browser.switchTo().window(tabs[1]);

		await utils.checkPrejoinIsPresent();
		await utils.clickOn('#microphone-button');
		await utils.clickOn('#join-button');

		// Go to first tab
		await browser.switchTo().window(tabs[0]);

		// Wait until NO_STREAM_PLAYING_EVENT exception timeout is reached
		await browser.sleep(6000);

		const exceptionQuantity = await utils.getNumberOfElements('#NO_STREAM_PLAYING_EVENT');
		expect(exceptionQuantity).equals(0);
	});
});
