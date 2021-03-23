from scipy.interpolate import interp1d
import numpy as np
import math

def find_peaks(history, metric):

	history = np.array(sorted(list(map(lambda x: (x['ts'], x['details'][metric]), history)), key=lambda x: x[0]))
	xs = history[:,0]
	ys = history[:,1]
	f = interp1d(xs, ys) #linear interpolation of the metric(time) function

	deltas = []
	dt = (3*24*60*60) #In seconds
	for i in range(1, len(history-2)):
		py = math.log10(f(max(xs[0], xs[i]-dt)))
		ny = math.log10(f(min(xs[-1], xs[i]+dt)))
		y = math.log10(ys[i])
		print(py, y, ny)
		
		slope_p = (y - py) / (dt)
		slope_n = (ny - y) / (dt)
		delta_time = 2*dt
		expected_linear_value = slope_p * delta_time + py #basically ax + b
		deltas.append((slope_n-slope_p))
	print(deltas)

	max_delta = np.max(deltas)
	peaks_ts = []
	while True:
		j = np.argmax(deltas)
		if deltas[j] < 0.7*max_delta:
			break
		deltas[j] = 0
		peaks_ts.append(xs[j+1])
	return peaks_ts