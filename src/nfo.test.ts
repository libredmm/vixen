import { afterEach, expect, test } from "bun:test";
import { chmod, mkdtemp, readdir, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { buildFilename, MAX_BASENAME, type VideoEntry } from "./canonical.ts";
import { createCtx } from "./ctx.ts";
import { pickImages, renderNfo, writeNfo } from "./nfo.ts";

const entry: VideoEntry = {
	node: {
		videoId: "100270",
		title: "Working <It> & More",
		releaseDate: "2016-07-23T17:30:00.000Z",
		modelsSlugged: [{ name: "Alice" }, { name: "Bob" }],
		images: {
			listing: [
				{
					src: "portrait-1x",
					width: 320,
					height: 362,
					highdpi: { double: "portrait-2x" },
				},
				{ src: "landscape-small", width: 320, height: 180 },
				{
					src: "landscape-big-1x",
					width: 627,
					height: 353,
					highdpi: { double: "landscape-big-2x" },
				},
			],
		},
	},
};

test("renderNfo maps the scene and escapes text", () => {
	const nfo = renderNfo("blackedraw", entry);
	expect(nfo).toContain(
		"<title>BLACKED RAW - Working &lt;It&gt; &amp; More</title>",
	);
	expect(nfo).toContain("<premiered>2016-07-23</premiered>");
	expect(nfo).toContain("<studio>BLACKED RAW</studio>");
	expect(nfo).toContain("<set>\n    <name>BLACKED RAW</name>\n  </set>");
	expect(nfo).toContain(
		"<actor>\n    <name>Bob</name>\n    <order>1</order>\n  </actor>",
	);
	expect(nfo).toContain(
		'<uniqueid type="local" default="true">blackedraw-100270</uniqueid>',
	);
});

test("pickImages takes the portrait as poster and widest landscape as art", () => {
	expect(pickImages(entry)).toEqual({
		poster: "portrait-2x",
		fanart: "landscape-big-2x",
	});
	expect(pickImages({ node: { ...entry.node, images: null } })).toEqual({
		poster: undefined,
		fanart: undefined,
	});
});

test("buildFilename leaves room for the -fanart.jpg artwork name", () => {
	const crowded: VideoEntry = {
		node: {
			...entry.node,
			modelsSlugged: Array.from({ length: 12 }, (_, i) => ({
				name: `Somebody With A Long Name ${i}`,
			})),
		},
	};
	const name = buildFilename("blackedraw", crowded);
	expect(name).toEndWith("Et Al [100270]");
	expect(Buffer.byteLength(name)).toBeLessThanOrEqual(MAX_BASENAME);
	expect(Buffer.byteLength(`${name}-fanart.jpg`)).toBeLessThanOrEqual(255);
});

const realFetch = globalThis.fetch;
const dirs: string[] = [];
afterEach(async () => {
	globalThis.fetch = realFetch;
	for (const dir of dirs.splice(0).reverse()) {
		await chmod(dir, 0o755);
		await rm(dir, { recursive: true, force: true });
	}
});

async function fixture() {
	const dir = await mkdtemp(join(tmpdir(), "vixen-nfo-"));
	dirs.push(dir);
	await Bun.write(
		join(dir, "data", "blackedraw.json"),
		JSON.stringify([entry]),
	);
	const video = join(
		dir,
		"lib",
		"Blackedraw - 2016-07-23 - Alice & Bob [100270].mp4",
	);
	await Bun.write(video, "");
	const jpeg = new Uint8Array([0xff, 0xd8, 0xff, 0xe0]);
	globalThis.fetch = (async () =>
		new Response(jpeg)) as unknown as typeof fetch;
	return { dir, video, ctx: await createCtx(join(dir, "data")) };
}

test("writeNfo writes metadata and artwork without leaving temp files", async () => {
	const { dir, video, ctx } = await fixture();
	expect(await writeNfo(ctx, video)).toBe(true);
	expect((await readdir(join(dir, "lib"))).sort()).toEqual([
		"Blackedraw - 2016-07-23 - Alice & Bob [100270]-fanart.jpg",
		"Blackedraw - 2016-07-23 - Alice & Bob [100270].jpg",
		"Blackedraw - 2016-07-23 - Alice & Bob [100270].mp4",
		"Blackedraw - 2016-07-23 - Alice & Bob [100270].nfo",
	]);
});

test("writeNfo reports a file it can't write instead of passing", async () => {
	const { dir, video, ctx } = await fixture();
	await chmod(join(dir, "lib"), 0o555);
	dirs.push(join(dir, "lib"));
	expect(await writeNfo(ctx, video)).toBe(false);
	expect(await readdir(join(dir, "lib"))).toEqual([
		"Blackedraw - 2016-07-23 - Alice & Bob [100270].mp4",
	]);
});
