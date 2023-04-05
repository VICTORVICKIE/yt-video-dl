<script lang="ts">
	import { browser } from '$app/environment'
	import { getVideoID, validateID, validateURL, type Result } from '$lib/utils'
	import { saveAs } from 'file-saver'

	let icon: string = 'ph:download-simple-duotone'
	let input_url: string

	function get_filename(content_disposition: string) {
		console.log(content_disposition)
		const filename_regex = /filename[^;=\n]*=(?:(\\?['"])(.*?)\1|(?:[^\s]+'.*?')?(?<file>[^;\n]*))/

		const match = filename_regex.exec(content_disposition)
		if (match) {
			return decodeURIComponent(match.groups?.file as string)
		}
	}

	function match_yt_url(url: string) {
		const is_valid_url = validateURL(url)
		if (is_valid_url) {
			const id = getVideoID(url)
			if (validateID(id)) {
				return { data: id, error: false }
			} else {
				return { data: 'Invalid Id', error: true }
			}
		} else {
			return { data: 'Invalid Url', error: true }
		}
	}

	async function save(url: Result) {
		const result = await fetch(`/download?video_id=${url.data}`)
		const content_disposition = result.headers.get('content-disposition')

		if (result.ok && content_disposition) {
			let video_blob = await result.blob()
			const file = get_filename(content_disposition)
			saveAs(video_blob, file)
		} else {
			console.log('error')
		}
	}

	async function download() {
		icon = 'ph:check-bold'

		const url = match_yt_url(input_url)

		if (!url.error) {
			await save(url)
		}

		if (!input_url) {
			await save({ data: 'dQw4w9WgXcQ', error: false })
		}

		setTimeout(() => {
			icon = 'ph:download-simple-duotone'
		}, 2500)
	}
	if (browser) {
	}
</script>

<div class="hero min-h-screen bg-base-200">
	<div class="hero-content flex-col">
		<div class="card bg-base-100 border-b border-l border-neutral shadow-xl">
			<div class="card-body relative w-96">
				<div class="input-group">
					<input
						bind:value={input_url}
						type="text"
						placeholder="https://youtu.be/dQw4w9WgXcQ"
						class="input w-80 input-bordered focus:outline-none"
					/>
					<button class="btn btn-square" on:click={download}>
						<iconify-icon {icon} width="24" />
					</button>
				</div>
			</div>
		</div>
	</div>
</div>
