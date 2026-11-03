import { expect, test } from "bun:test";
import type { VideoEntry } from "./canonical.ts";
import { pickImages, renderNfo } from "./nfo.ts";

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
