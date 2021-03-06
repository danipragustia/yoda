const http = require('https')
const ytdl = require('ytdl-core')
const ffmpeg = require('fluent-ffmpeg')
const ytpl = require('ytpl')
const path = require('path')
const fs = require('fs')
const readline = require('readline')
const cli = require('readline').createInterface({
    input: process.stdin,
    output: process.stdout
})

function formatBytes(a,b=2){if(0===a)return"0 Bytes";const c=0>b?0:b,d=Math.floor(Math.log(a)/Math.log(1024));return parseFloat((a/Math.pow(1024,d)).toFixed(c))+" "+["Bytes","KB","MB","GB","TB","PB","EB","ZB","YB"][d]}

const menu = x => x.map((x,y) => console.log(y + 1 + '. ' + x))

const download = (link, itag, container) => new Promise((resolve, reject) => {
    let video = ytdl(link, { quality: itag })
    let starttime
    
    video.pipe(fs.createWriteStream(path.join(process.cwd(), '/' + ytdl.getURLVideoID(link) + '-' + itag + '.' + container)))
    video.once('response', () => {
	console.log('[+] Downloading has started...')
	starttime = Date.now();
    })

    video.on('progress', (chunkLength, downloaded, total) => {
	const percent = downloaded / total
	const downloadedMinutes = (Date.now() - starttime) / 1000 / 60
	const estimatedDownloadTime = (downloadedMinutes / percent) - downloadedMinutes
	readline.cursorTo(process.stdout, 0)
	console.clear()
	console.log('[+] Downloading [' + link + ']...')
	console.log(`${(percent * 100).toFixed(2)}% downloaded `)
	console.log(`(${(downloaded / 1024 / 1024).toFixed(2)}MB of ${(total / 1024 / 1024).toFixed(2)}MB)\n`)
	console.log(`running for: ${downloadedMinutes.toFixed(2)} Minutes`)
	console.log(`estimated time left: ${estimatedDownloadTime.toFixed(2)} Minutes `)
    })

    video.on('end', () => {
	resolve(true)
    })
})

const fetchBest = (link, videos, audios, title) => new Promise((resolve, reject) => {

    if (videos.length > 1) {

	let video = videos.filter(x => x.container == 'mp4')[0]
	let audio = audios[0]

	download(link, video.itag, video.container).then((res) => {
	    download(link, audio.itag, audio.container).then((res) => {
		console.log('[+] Rendering the video, it tooks time...')
		let videopath = path.join(process.cwd(), '/' + ytdl.getURLVideoID(link) + '-' + video.itag + '.' + video.container)
		let audiopath = path.join(process.cwd(), '/' + ytdl.getURLVideoID(link) + '-' + audio.itag + '.' + audio.container)
		let outputpath = path.join(process.cwd(), '/' + title.replace('/','_').replace('\\','_') + '.mp4') 
		
		console.log('[+] Video quality selected : ' + video.qualityLabel + ' (' + video.container + ' ' + video.videoCodec + ')')
		console.log('[+] Audio quality selected : ' + audio.container + ' ' + audio.audioCodec + ' (' + audio.audioBitrate + 'kbps)')
		console.log('[+] Transcoding : ' + (video.container == 'mp4' ? 'not needed' : 'libx264'))
		let command = ffmpeg(videopath)
		    .input(audiopath)
		    .videoCodec((video.container == 'mp4' ? 'copy' : 'libx264'))
		    .audioCodec('libopus')
		    .on('progress', progress => {
			console.log('[+] Progress : ' + progress.percent.toFixed() + '%')
		    })
		    .on('error', err => {
			fs.unlinkSync(videopath)
			fs.unlinkSync(audiopath)
			console.log('[+] An error occurred: ' + err.message)
			reject(err)
		    })
		    .on('end', () => {
			fs.unlinkSync(videopath)
			fs.unlinkSync(audiopath)
			console.log('[+] Processing finished !')
			resolve(outputpath)
		    })
		    .save(outputpath)
	    })
	})
	
    }

})

const fetch = (link, videos, audios, title) => new Promise((resolve, reject) => {

    if (videos.length > 1) {
	//console.log(videos)
	//console.log(audios)
	console.log('[+] Select the quality of video on below')
	videos.map((x,y) => console.log('  ' + (y + 1) + '. ' + x.qualityLabel + ' (' + x.container + ' ' + x.videoCodec + ') ['  + formatBytes(x.contentLength) + ']'))
	cli.question('\n(1-' + videos.length + ') : ', async video => {

	    if (videos[video - 1] === 'undefined') {

		console.log('[+] Out of Index, exiting the process...')
		main()
		
	    } else {
		console.log()
		console.log('[+] Select the quality of audio on below')
		audios.map((x,y) => console.log('  ' + (y + 1) + '. ' + x.container + ' ' + x.audioCodec + ' (' + x.audioBitrate + 'kbps) [' + formatBytes(x.contentLength) + ']'))
		cli.question('\n(1-' + audios.length + ') : ', async audio => {

		    if (audios[audio - 1] === 'undefined') {

			console.log('[+] Out of Index, exiting the process...')
			main()

		    } else {

			download(link, videos[video - 1].itag, videos[video - 1].container).then((res) => {
			    download(link, audios[audio - 1].itag, audios[audio - 1].container).then((res) => {
				console.log('[+] Rendering the video, it tooks time...')
				let videopath = path.join(process.cwd(), '/' + ytdl.getURLVideoID(link) + '-' + videos[video - 1].itag + '.' + videos[video - 1].container)
				let audiopath = path.join(process.cwd(), '/' + ytdl.getURLVideoID(link) + '-' + audios[audio - 1].itag + '.' + audios[audio - 1].container)
				let outputpath = path.join(process.cwd(), '/' + title.replace('/','_').replace('\\','_') + '.mp4')
				console.log('[+] Video quality selected : ' + videos[video - 1].qualityLabel + ' (' + videos[video - 1].container + ' ' + videos[video - 1].videoCodec + ')')
				console.log('[+] Audio quality selected : ' + audios[audio - 1].container + ' ' + audios[audio - 1].audioCodec + ' (' + audios[audio - 1].audioBitrate + 'kbps)')
				console.log('[+] Transcoding : ' + (videos[video - 1].container == 'mp4' ? 'not needed' : 'libx264'))
				let command = ffmpeg(videopath)
				    .input(audiopath)
				    .videoCodec((videos[video - 1].container == 'mp4' ? 'copy' : 'libx264'))
				    .audioCodec('libopus')
				    .on('progress', progress => {
					console.log('[+] Progress : ' + progress.percent.toFixed() + '%')
				    })
				    .on('error', err => {
					fs.unlinkSync(videopath)
					fs.unlinkSync(audiopath)
					console.log('[+] An error occurred: ' + err.message)
					reject(err)
				    })
				    .on('end', () => {
					fs.unlinkSync(videopath)
					fs.unlinkSync(audiopath)
					console.log('[+] Processing finished !')
					resolve(outputpath)
				    })
				    .save(outputpath)
			    })
			})
			
		    }

		})
		
	    }
	    
	})
	
    } else {
	download(link, videos[0].itag, videos[0].qualityLabel).then((res) => {
	    console.log('[+] Done!')
	    main()
	})
    }

})

async function main() {
    menu([
	'Link video',
	'Playlist / Channel Video(s)'
    ])
    console.log('0. Keluar')
    cli.question('> ', async select => {
	if (select == 1) {
	    cli.question('Link Video : ', async link => {
		console.log('[+] Fetching video(s), please wait warmly...\n')
		let info = await ytdl.getInfo(ytdl.getURLVideoID(link))
		fetch(link, ytdl.filterFormats(info.formats, 'videoonly'), ytdl.filterFormats(info.formats, 'audioonly'), info.videoDetails.title).then((res) => {
		    console.log('[+] File location : ' . res)
		    console.log('[+] Done')
		    main()
		})
	    })
	} else if (select == 2) {
	    cli.question('ID Playlist / Channel (bukan URL) : ', async id => {
		await ytpl(id).then(async res => {
		    console.log('[+] There ' + res.total_items + ' video(s) ready to download\n')
		    menu([
			'Automatically highest one',
			'Manually for every single time'
		    ])
		    cli.question('Select options : ', async options => {
			const startedPromise = Promise.resolve(null)
			if (options == 1) {
			    await res.items.reduce(
				(p, video) => p.then(async () => {
				    console.log('[+] Fetching video(s), please wait warmly...\n')
				    let info = await ytdl.getInfo(ytdl.getURLVideoID(video.url_simple))
				    await fetchBest(video.url_simple, ytdl.filterFormats(info.formats, 'videoonly'), ytdl.filterFormats(info.formats, 'audioonly'),info.videoDetails.title).then((res) => {
					console.log('[+] File location : ' . res)
				    })
				}),startedPromise
			    )
			    console.log('[+] Done!')
			    main()
			} else if (options == 2) {
			    await res.items.reduce(
				(p, video) => p.then(async () => {
				    console.log('[+] Fetching video(s), please wait warmly...\n')
				    let info = await ytdl.getInfo(ytdl.getURLVideoID(video.url_simple))
				    await fetch(video.url_simple, ytdl.filterFormats(info.formats, 'videoonly'), ytdl.filterFormats(info.formats, 'audioonly'),info.videoDetails.title).then((res) => {
					console.log('[+] File location : ' . res)
				    })
				}),startedPromise
			    )
			    console.log('[+] Done!')
			    main()
			} else {
			    console.log('[+] Aborting...')
			    main()
			}
		    })

		})
	    })
	} else if (select == 0) {
	    console.log('[+] Exiting program...')
	    process.exit(1)
	} else {
	    console.log('[-] Invalid Select')
	    main()
	}
    })
}

main()
