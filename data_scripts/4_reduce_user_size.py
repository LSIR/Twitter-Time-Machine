import numpy as np
import json
import math
import sys
from numpy.ma import sort
from scipy.interpolate import interp1d
import gzip

def find_peaks(history, metric):
	"""Taken from the Twitter Time Machine application
	   Find the peaks in the given historical data"""

	history = np.array(list(map(lambda x: (x['ts'], x['details'][metric]), history)))
	xs = history[:,0]
	ys = history[:,1]
	f = interp1d(xs, ys) #linear interpolation of the metric(time) function

	deltas = []
	max_slope = 0
	avg_slope = (f(xs[-1])-f(xs[0])) / ((xs[-1]-xs[0]) / (1))
	dt = (4*24*60*60) #In seconds
	for i in range(1, len(history)-2):
		py = f(max(xs[0], xs[i]-dt))
		ny = f(min(xs[-1], xs[i]+dt))
		y = ys[i]
		log_py = math.log10(max(1,py))
		log_ny = math.log10(max(1,ny))
		log_y = math.log10(max(1,y))
		
		slope_p = (log_y - log_py) / (dt)
		slope_n = (log_ny - log_y) / (dt)

		true_slope = (ny - y) / (dt)
		if true_slope > max_slope:
			max_slope = true_slope
		delta_time = 2*dt
		expected_linear_value = slope_p * delta_time + log_py #basically ax + b
		deltas.append(log_ny-expected_linear_value)

	max_delta = np.max(deltas)
	print(max_delta)
	peaks_ts = []
	while True:
		j = np.argmax(deltas)			
		if deltas[j] < 0.3 * max_delta or deltas[j] < 0:
			break
		deltas[j] = 0
		c = len(list(filter(lambda x: (xs[j+1] >= x - dt and xs[j+1] <= x + dt), peaks_ts)))
		if c > 0: #too close to another peak
			continue
		peaks_ts.append(xs[j+1])
	return (peaks_ts, max_slope, avg_slope)

def triangleArea(line_p1, line_p2, p):
	#https://www.mathopenref.com/coordtrianglearea.html
	#ts is y and ["details"]["followers_count"] is x
	return abs(line_p1['ts']*(line_p2["details"]["followers_count"]-p["details"]["followers_count"]) 
	             + line_p2['ts']*(p["details"]["followers_count"]-line_p1["details"]["followers_count"]) 
				 + p['ts']*(line_p1["details"]["followers_count"]-line_p2["details"]["followers_count"])) / 2 + (line_p1['ts'] - p['ts'])

def optimizePoints(data, max, peaks):
	"""Optimize the number of points, keeping the peaks"""
	points = data
	if(len(points) > max):
		newPoints = [points[0], points[len(points) - 1]]
		hitterWeight = []
		for i in np.arange(1, len(points)-1, 1):
			idx = i
			temp = points[idx]["ts"]
			if temp in peaks:
				hitterWeight.append([idx, sys.maxsize])
			else:
				hitterWeight.append([idx, triangleArea(points[idx-1], points[idx], points[idx+1])])
		
		hitterWeight = sorted(hitterWeight, key=lambda x: x[1], reverse=False)
		for i in range(max):
			newPoints.append(points[hitterWeight[i][0]])
		
		newPoints = sorted(newPoints, key=lambda x: x["ts"], reverse=False)
		return newPoints
	
	return points


big_users = []
max_points = 50000 # creeates a history size of around 12 MB

with gzip.open("ignored_users.json.gz") as f:
        big_users = json.loads(f.read().decode('utf-8'))

for user in big_users:
	print("Processing user {}".format(user["_id"]))

	size = sum([sys.getsizeof(e) for e in user["history"]]) / (1024*1024)
	print("History size before : {} MB".format(size))

	peaks_ts, _, _ = find_peaks(user["history"], "followers_count")
	user["history"] = optimizePoints(user["history"], max_points, peaks_ts)

	size = sum([sys.getsizeof(e) for e in user["history"]]) / (1024*1024)
	print("History size after : {} MB".format(size))

with gzip.open("ignored_users_16mb.json.gz", 'wt', encoding='UTF-8') as f:
        json.dump(big_users, f)
