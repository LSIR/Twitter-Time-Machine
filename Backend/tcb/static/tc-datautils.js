function distanceLinePoint(line_p1, line_p2, p) {
	//https://math.stackexchange.com/questions/422602/convert-two-points-to-line-eq-ax-by-c-0
	let a = line_p1['y']-line_p2['y']
	let b = line_p2['x']-line_p1['x']
	let c = line_p1['x']*line_p2['y']-line_p1['y']*line_p2['x']
	//https://fr.wikipedia.org/wiki/Distance_d%27un_point_%C3%A0_une_droite
	return Math.abs(a*p['x']+b*p['y']+c)/Math.sqrt(a*a+b*b) + (line_p1['x'] - p['x']) //added t delta for uniform distrib
}

function triangeArea(line_p1, line_p2, p) {
	//https://www.mathopenref.com/coordtrianglearea.html
	return Math.abs(line_p1['x']*(line_p2['y']-p['y']) + line_p2['x']*(p['y']-line_p1['y']) + p['x']*(line_p1['y']-line_p2['y'])) / 2 + (line_p2['x'] - line_p1['x']);
}

function optimizePoints(data, max, peaks) {
	let points = data;
	if(points.length > max) {
		let newPoints = [points[0], points[points.length-1]];
		let hitterWeight = [];
		for(let i = 1; i < points.length-1; i++) {
			let idx = i
			if(peaks.includes(points[idx].x.getTime() / 1000)) {
				hitterWeight.push([idx, Number.MAX_VALUE]) // enforce that peak points are not optimized
			} else {
				//we make pairs of (index, hittingWeight)
				hitterWeight.push([idx, triangeArea(points[idx-1], points[idx], points[idx+1])]);
			}
		}
		hitterWeight.sort((a,b) => b[1]-a[1]) //sort by hitting weight
		for(let i = 0; i < max; i++) {
			newPoints.push(points[hitterWeight[i][0]])
		}
		newPoints.sort((a, b) => a.x-b.x)
		return newPoints
	}
	return points;
}

/** https://www.tutorialspoint.com/levenshtein-distance-in-javascript */
function levenshteinDistance(str1, str2) {
	if(str1 == null || str2 == null) return 0;
	const track = Array(str2.length + 1).fill(null).map(() =>
   	Array(str1.length + 1).fill(null));
	for (let i = 0; i <= str1.length; i += 1) {
		track[0][i] = i;
	}
	for (let j = 0; j <= str2.length; j += 1) {
		track[j][0] = j;
	}
	for (let j = 1; j <= str2.length; j += 1) {
		for (let i = 1; i <= str1.length; i += 1) {
			const indicator = str1[i - 1] === str2[j - 1] ? 0 : 1;
			track[j][i] = Math.min(
				track[j][i - 1] + 1, // deletion
				track[j - 1][i] + 1, // insertion
				track[j - 1][i - 1] + indicator, // substitution
			);
		}
	}
	return track[str2.length][str1.length];
}

function profileSubgrades(screen_name_history, name_history, description_history, metrics_history, deletion_history, peaks) {
	let subgrades = [];
	subgrades.push(screen_name_history.reduce((p, c, idx, a) => p + levenshteinDistance(a[Math.max(0, idx-1)].screen_name, c.screen_name), 0)
					+ name_history.reduce((p, c, idx, a) => p + levenshteinDistance(a[Math.max(0, idx-1)].name, c.name), 0) / 10
					+ description_history.reduce((p, c, idx, a) => p + levenshteinDistance(a[Math.max(0, idx-1)].description, c.description), 0) / 1000);
	subgrades.push(deletion_history.length / 20);
	subgrades.push(peaks.length);
	return subgrades;
}

function profileGrade(screen_name_history, name_history, description_history, metrics_history, deletion_history, peaks) {
	//Grade = 100-(dist(screen_name))-(dist(name)/10)-(dist(description)/1000)-(#deletions/20)-#peaks
	let grade = 100;
	let grades = profileSubgrades(screen_name_history, name_history, description_history, metrics_history, deletion_history, peaks);
	grade -= grades[0];
	grade -= grades[1];
	grade -= grades[2];
	return Math.max(0,grade);
}

function topK(array, k, cmp) {
	if(array.length <= k) {
		let cpy = [...array]
		cpy.sort(cmp);
		return cpy;
	}
	let top = []
	let lastIdx = 0;
	let addedIdx = {}
	for(let i = 0; i < k; i++) {
		array.forEach(function(e, idx) {
			if(!(idx in addedIdx) && cmp(array[lastIdx], e) >= 0) {
				lastIdx = idx;
			}
		})
		addedIdx[lastIdx] = 1;
		top.push(array[lastIdx]);
		lastIdx = 0
		while(lastIdx in addedIdx) {
			lastIdx++;
		}
	}
	return top;
}

function makeTweetCard(e, hideDate) {
	let nh = ""
	let rts = (e.retweet_count !== undefined ? e.retweet_count : '?') + ' <i class="bi bi-arrow-left-right"></i> '
	let quotes = (e.quote_count !== undefined ? e.quote_count : '?') + ' <i class="bi bi-chat-left-quote"></i> '
	let favs = (e.favorite_count !== undefined ? e.favorite_count : '?') + ' <i class="bi bi-heart"></i>'

	let date = new Date(e.ts * 1000)
	nh += '<div class="card mb-1" style="color:black;text-align:left">\
				<div class="card-body">\
					<h6 class="card-title">'+ rts + quotes + favs + '</h6>\
					<h6 class="card-subtitle mb-2 text-muted">'+ (hideDate?"":date) + '</h6>\
					<p class="card-text">'+ e.text + '</p>\
				</div>\
			</div>';
	return nh;
}