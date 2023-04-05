import { json, type RequestHandler } from '@sveltejs/kit'
import { exec, spawn } from 'child_process'
import ffmpeg_path from 'ffmpeg-static'
import fsx from 'fs-extra'
import { readFile } from 'fs/promises'
import sanitize from 'sanitize-filename'
import type { Readable, Writable } from 'stream'
import ytdl from 'ytdl-core'

interface Result {
    data: string
    error: boolean
}

async function get_quality_video(video_formats: ytdl.videoFormat[], quality: number) {
    let selected_video_format

    for (const video_format of video_formats) {
        const quality_regex = /(\d+)p/
        const match = video_format.qualityLabel.match(quality_regex)
        const quality_idx = 1
        if (match && parseInt(match[quality_idx]) <= quality) {
            if (
                !selected_video_format ||
                parseInt(video_format.qualityLabel) > parseInt(selected_video_format.qualityLabel)
            ) {
                selected_video_format = video_format
            }
        }
    }
    return selected_video_format
}

// prettier-ignore
async function merge_AV(audio_stream: Readable, video_stream: Readable, output: string): Promise<Result> {
    return new Promise((resolve, reject) => {
        const ffmpeg = spawn(ffmpeg_path as string,
            [
                '-loglevel', '8', '-hide_banner', '-progress',
                'pipe:3', '-i', 'pipe:4', '-i', 'pipe:5',
                '-map', '0:a', '-map', '1:v', '-c:v',
                'copy', `./downloads/${output}`
            ],
            {
                windowsHide: true,
                stdio: [
                    /* Standard: stdin, stdout, stderr */
                    'inherit', 'inherit', 'inherit',
                    /* Custom: pipe:3, pipe:4, pipe:5 */
                    'pipe', 'pipe', 'pipe'
                ]
            }
        )

        ffmpeg.on('close', (code) => {
            if (code === 0) {
                const result: Result = { data: output, error: false }
                resolve(result)
            } else {
                const result: Result = { data: `FFmpeg exited with code ${code}`, error: true }
                reject(result)
            }
        })

        audio_stream.pipe(ffmpeg.stdio[4] as Writable)
        // @ts-expect-error - I don't know why this is an error, stdio len is 6!
        video_stream.pipe(ffmpeg.stdio[5] as Writable)
    })
}

async function download_video(video_id: string) {
    const info = await ytdl.getInfo(video_id)
    const video_formats = ytdl.filterFormats(info.formats, 'videoonly')
    const audio_formats = ytdl.filterFormats(info.formats, 'audioonly')

    const output = sanitize(`${info.videoDetails.title}.mp4`)
    let result: Result = { data: output, error: false }

    const selected_video_format = await get_quality_video(video_formats, 1080)

    if (!selected_video_format) {
        result = { data: 'No video format found', error: true }
        return result
    }

    const selected_audio_format = audio_formats[0]

    const video_stream = ytdl(video_id, {
        quality: selected_video_format.itag
    })

    const audio_stream = ytdl(video_id, {
        quality: selected_audio_format.itag
    })

    await fsx.emptyDir('./downloads')
    result = await merge_AV(audio_stream, video_stream, output)

    return result
}

export const GET: RequestHandler = async () => {
    const result: Result = await download_video('6xKWiCMKKJg')

    if (result.error) {
        return json(result)
    } else {
        const buffer = await readFile(`./downloads/${result.data}`)
        return new Response(buffer, {
            status: 200,
            headers: {
                'Content-Type': 'application/octet-stream',
                'Content-Disposition': `attachment; filename*=UTF-8''${encodeURIComponent(result.data)}`
            }
        })
    }
}
