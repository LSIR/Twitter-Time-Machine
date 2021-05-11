from scipy.interpolate import interp1d
import numpy as np
import math

def find_peaks(history, metric):

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
		log_py = math.log10(py)
		log_ny = math.log10(ny)
		log_y = math.log10(y)
		
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
		if deltas[j] < 0.3 * max_delta:
			break
		deltas[j] = 0
		c = len(list(filter(lambda x: (xs[j+1] >= x - dt and xs[j+1] <= x + dt), peaks_ts)))
		if c > 0: #too close to another peak
			continue
		peaks_ts.append(xs[j+1])
	return (peaks_ts, max_slope, avg_slope)