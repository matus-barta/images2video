const fs = require("fs").promises;
const fsSync = require("fs");
const path = require("path");
const os = require("os");
const spawn = require("child_process").spawn;
const rimraf = require("rimraf");
const { argv } = require("yargs")
	.option("imageDuration", {
		demandOption: true,
		describe: "How long each image is shown (in seconds)",
		type: "number",
	})
	.option("filename", {
		demandOption: true,
		describe: "The name of the output file. It will be put into the output directory. Must end with mp4",
		type: "string",
	})
	.check((argv) => {
		return argv.imageDuration > 0 && argv.filename.endsWith(".mp4");
	});

var filesArr;

const withTempDir = async (fn) => {
	const dir = await fs.mkdtemp(await fs.realpath(os.tmpdir()) + path.sep);
	try {
		return await fn(dir);
	} finally {
		rimraf(dir, () => { });
	}
};

const getImage = (i) => {
	return fsSync.readFileSync(`img/${filesArr[i]}`);
};

const getImageSequence = (num) => {
	return Array(num).fill().map((_e, i) => getImage(i));
};

const generateVideoV3 = (filename) => async (sequence) => {
	const fps = 60;
	const crossfadetime = 1;
	const crossfadeInFrames = Math.floor(fps * crossfadetime);

	return withTempDir(async (dir) => {
		await Promise.all(sequence.map(({ image }, index) => fs.writeFile(path.join(dir, `${index}.png`), image)));

		const timedSequence = sequence.reduce((memo, e) => {
			return [
				...memo,
				{
					...e,
					startFrame: (memo.reduce((m, e) => m + e.duration, 0)) * fps + memo.length * crossfadeInFrames,
				}
			];
		}, []);
		const videolength = sequence.reduce((memo, e) => memo + e.duration * fps, 0) + (sequence.length - 1) * crossfadeInFrames;

		const config = timedSequence.map(({ startFrame }, index) => {
			const nextStartFrame = index !== timedSequence.length - 1 ? timedSequence[index + 1].startFrame : videolength;
			const durationInFrames = nextStartFrame - startFrame;
			return `${dir}/${index}.png out=${durationInFrames + crossfadeInFrames}${index !== 0 ? ` -mix ${crossfadeInFrames} -mixer luma` : ""}`;
		}).join(" ");

		await new Promise((res, rej) => {
			const ffmpeg = spawn("melt", [...config.split(" "), "-consumer", `avformat:/tmp/output/${filename}`, `frame_rate_num=${fps}`, "width=1920", "height=1080", "sample_aspect_num=1", "sample_aspect_den=1"]);
			ffmpeg.stderr.on("data", (data) => {
				console.log(data.toString("utf-8"));
			});
			ffmpeg.stdout.on("data", (data) => {
				console.log(data.toString("utf-8"));
			});
			ffmpeg.on("close", (code) => {
				if (code === 0) {
					res();
				} else {
					rej(code);
				}
			});
			ffmpeg.on("error", rej);
		});
	});
};

["SIGINT", "SIGTERM"].forEach((signal) => process.on(signal, () => process.exit(0)));


(async () => {
	filesArr = fsSync.readdirSync("img/");
	console.log(filesArr);

	try {
		await fs.unlink(`/tmp/output/${argv.filename}`);
	} catch (e) { }
	const numImages = filesArr.length;

	const sequence = getImageSequence(numImages).map((image) => {
		return {
			image,
			duration: argv.imageDuration,
		};
	});

	const algo = (() => {
		return generateVideoV3;
	})();
	await algo(argv.filename)(sequence);
})();
