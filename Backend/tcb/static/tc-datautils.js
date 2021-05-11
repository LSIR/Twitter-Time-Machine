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
	return Math.abs(line_p1['x']*(line_p2['y']-p['y']) + line_p2['x']*(p['y']-line_p1['y']) + p['x']*(line_p1['y']-line_p2['y'])) / 2 + (line_p1['x'] - p['x']);
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