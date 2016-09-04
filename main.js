let c_id = '750c4b636366062afa25b2028704b966';
SC.initialize({
	client_id: c_id
});

let Streamer = function() {
	this.currentSongInfo = {
		ready: false,
		freqIntervalFunction: undefined,
		playing: false,
		started: false,
		song: undefined,
        time_started: millis(),
        duration: undefined,
        comments: [],
        current_comment: {'body': ''},
		id: undefined,
		stream_url: undefined,
		full_stream_url: undefined,
		volume: 0,
		freqData: new Uint8Array(128)
	};

	this.readyStream = function(n_url) {
		let visualizer = document.createElement('audio');
		visualizer.id = 'visualizer';
		visualizer.crossOrigin = 'anonymous';

		document.body.appendChild(visualizer);
		SC.resolve(n_url).then((v) => { // arrow function get enclosed "this" value unlike normal anonymous functions
			this.currentSongInfo['stream_url'] = v['stream_url'];
			this.currentSongInfo['title'] = v['title'];
			this.currentSongInfo['id'] = v['id'];
			this.currentSongInfo['duration'] = v['duration'];
			this.currentSongInfo['full_stream_url'] = `${this.currentSongInfo.stream_url}?client_id=${c_id}`;
            
            
			let audioPlayer = document.getElementById('visualizer');
			audioPlayer.setAttribute('src', this.currentSongInfo['full_stream_url']);

			this.currentSongInfo['ready'] = true;
            SC.get('/tracks/' + this.currentSongInfo['id'] + '/comments').then((v) => {
                this.currentSongInfo['comments'] = v;
                this.currentSongInfo['current_comment'] = v[0];
            });
		});
        

	}

	this.startStream = function() {
		let self = this;
		if(!this.currentSongInfo['playing']) {
			let visualizer = document.getElementById('visualizer');

			if(!this.currentSongInfo['started']) {
				this.currentSongInfo['started'] = true;
				let audioContext = new window.AudioContext();
				let analyser = audioContext.createAnalyser();
				analyser.fftSize = 256;

				let src = audioContext.createMediaElementSource(visualizer);
				src.connect(analyser);
				analyser.connect(audioContext.destination);

				let getAudioInfo = function() {
					analyser.getByteFrequencyData(self.currentSongInfo['freqData']);
					let total = 0;
					for(let i = 0; i < 80; i++) {
						total += self.currentSongInfo['freqData'][i];
					}

					self.currentSongInfo['volume'] = total;
				}

				this.currentSongInfo['freqIntervalFunction'] = setInterval(getAudioInfo, 20);
			}

			visualizer.play();
			this.currentSongInfo['playing'] = true;
		}
	}

	this.resetStream = function() {
		clearInterval(this.currentSongInfo['freqIntervalFunction']);
		this.currentSongInfo = {
			ready: false,
			playing: false,
			started: false,
			song: undefined,
	        time_started: millis(),
	        duration: undefined,
	        comments: [],
	        current_comment: {'body': ''},
			id: undefined,
			stream_url: undefined,
			full_stream_url: undefined,
			volume: 0,
			freqData: new Uint8Array(128)
		};
		document.body.removeChild(document.getElementById('visualizer'));
		
	}

	this.pauseStream = function() {
		if(this.currentSongInfo['playing']) {
			document.getElementById('visualizer').pause();
			this.currentSongInfo['playing'] = false;
		}
	}
    
    this.getCurrentComment = function() {
        let time_played = (millis() - this.currentSongInfo.time_started);
        let closest = this.currentSongInfo['comments'][0];
        for(let comment of this.currentSongInfo['comments']) {
            if(comment.timestamp !== null) {
                let diffClosest = Math.abs(closest.timestamp - time_played),
                    diffNow = Math.abs(comment.timestamp - time_played);

                if(diffNow < diffClosest) {
                    closest = comment;
                }
            }
        }
        if(closest) {
            this.currentSongInfo['current_comment'] = closest;
        }
    }

    this.setVolume = function(newVolume) {
    	// pass either a decimal from 0-1 or a number from 0-100
    	newVolume = ((newVolume <= 1) ? newVolume : map(newVolume, 0, 100, 0, 1));
    	document.getElementById('visualizer').volume = newVolume;
    }

    this.setColorConstants = function(averageFrequency) {
    	let targetColorConstants = [];
		if(averageFrequency >= 0 && averageFrequency < 75) {
			targetColorConstants = [0.75, 1, 1.5];
		} else if(averageFrequency >= 75 && averageFrequency < 100) {
			targetColorConstants = [1.5, 1.25, 0.5];
		} else if(averageFrequency >= 100 && averageFrequency < 125) {
			targetColorConstants = [0.75, 1.5, 0.75];
		} else if(averageFrequency >= 125 && averageFrequency < 150) {
			targetColorConstants = [1.25, 0.5, 1];
		} else if(averageFrequency >= 150 && averageFrequency < 175) {
			targetColorConstants = [0.5, 0.25, 1.25];
		} else if(averageFrequency >= 175 && averageFrequency < 200) {
			targetColorConstants = [0.5, 2, 1.25];
		} else {
			targetColorConstants = [2, 0.5, 0.25];
		}
		if(averageFrequency) {
			primaryColorCoefficients = primaryColorCoefficients.map((c, i) => { return lerp(c, targetColorConstants[i], 0.05)});
		}
    }
}

let streamer;
let primaryColorCoefficients = [1, 1, 1];
let options = ['https://soundcloud.com/chancetherapper/no-problem-feat-lil-wayne-2-chainz', 'https://soundcloud.com/tydollasign/blase', 'https://soundcloud.com/chancetherapper/angels-feat-saba',
				'https://soundcloud.com/chancetherapper/pusha-man-ft-nate-fox-lili-k'];
let largestTextSize = 30;
function setup() {
	createCanvas(windowWidth, windowHeight);
	streamer = new Streamer();
	streamer.readyStream(options[Math.floor(Math.random() * options.length)]);
}

function draw() {
	if(streamer.currentSongInfo['ready']) {
		if(!streamer.currentSongInfo['started']) { streamer.startStream(); streamer.currentSongInfo['time_started'] = millis(); }
		if(streamer.currentSongInfo['playing']) {
			let freqData = streamer.currentSongInfo['freqData'];
			let volume = streamer.currentSongInfo['volume'];

			let removeZeroes = freqData.filter((a) => { return a !== 0 });
			let averageFrequency = (removeZeroes.reduce((a, b) => { return a + b}, 0) / removeZeroes.length);
			background(0);
			rectMode(CENTER);
			streamer.setColorConstants(averageFrequency);
            for(let freq in removeZeroes) {
            	fill(removeZeroes[freq] * primaryColorCoefficients[0], removeZeroes[freq] * primaryColorCoefficients[1], removeZeroes[freq] * primaryColorCoefficients[2]);
                rect(15 + (freq * 20), windowHeight / 2, 10, map(removeZeroes[freq], 0, 255, 0, windowHeight / 2));
            }
            
            streamer.getCurrentComment();
            
            let nextComment = ((streamer.currentSongInfo['current_comment']['user']) ? (`${streamer.currentSongInfo['current_comment']['user']['username']}: ${streamer.currentSongInfo['current_comment']['body']}`) : (`Anonymous: ${streamer.currentSongInfo['current_comment']['body']}`));
            textSize(largestTextSize);
            while(textWidth(nextComment) >= width) {
            	largestTextSize--;
            	textSize(largestTextSize);
            }
            fill(255);
            textAlign(CENTER);
            text(nextComment, width / 2, height - 50);
            largestTextSize = 30;

            if(millis() - streamer.currentSongInfo['time_started'] >= streamer.currentSongInfo['duration'] + 1000) {
            	streamer.resetStream();
            	streamer.readyStream(options[Math.floor(Math.random() * options.length)]);
            }
		}
	} else {
		background(255, 0, 0);
	}
}

function windowResized() {
	resizeCanvas(windowWidth, windowHeight);
}

function keyPressed() {
    switch(keyCode) {
        case 27: if(streamer.currentSongInfo['playing']) { streamer.pauseStream() } else { streamer.startStream() }; break;
    }
}