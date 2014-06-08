Feature Timeline Chart
=========================

## Overview

We have implemented a Feature Timeline Chart using the AppSDK which plots a feature's start and end date (shown in yellow) and the releases associated with the Users Stories from that feature.


Each column represents a release, the y axis representing the size based on the story count and the x axis the overall timeline of the feature.  This allows you to see how a given feature is rolling out over time.

Releases are color coded. Past releases which are completed as in this example are dark blue, wheres past releases with incomplete work are identified with a light blue.  Future and ongoing releases are color coded according to a basic risk assessment.

The risk assessment is based on a ratio of total stories completed vs remaining over the amount of time elapsed vs time remaining in the release.

There are currently 3 levels of risk :
	green (which is On Track)
	pink (at risk)
	and a reddish color which identifies a release as having the most risk, or 'most likely late'

##License

Feature Timeline Chart is released under the MIT license.  See the file [LICENSE](./LICENSE) for the full text.

##Documentation for Rally AppSDK

You can find the documentation on our help [site.](https://help.rallydev.com/apps/2.0rc3/doc/)
