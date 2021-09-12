class Map {
	constructor(centerLat, centerLon, zoom = 16) {
		this.map = new L.Map('map', {fullscreenControl: true})
		this.map.setView(new L.LatLng(centerLat, centerLon), zoom)
		this.markers = L.markerClusterGroup({disableClusteringAtZoom: 16})
		this.trackMarkers = new L.LayerGroup()

		this.links = []

		this.destinationMarker = null
		this.trackLine = null

		this.icon = L.icon({
			iconUrl: '/build/images/my-icon.png',
			iconSize: [22, 36],
			iconAnchor: [11, 36],
			popupAnchor: [0, -18],
		})

		this._initMap()
	}

	displayMaxFieldData(maxField) {
		this.links = maxField.links

		this.loadMarkers(maxField.wayPoints)
		this.loadTrack()

		this.showDestination(0)

		this.addLegend()
	}

	loadMarkers(markerObjects) {
		// const icon = this.icon
		this.markers.clearLayers()

		const markers = this.markers
		const map = this.map
		markerObjects.forEach(function (o) {
			let marker =
				new L.Marker(
					new L.LatLng(o.lat, o.lon),
					{
						// icon: icon
					}
				).bindPopup('<b>' + o.name + '</b><br>' + o.desc)
			markers.addLayer(marker)
			map.addLayer(markers)
		})
	}

	loadTrack() {
		let pointList = []
		let num = 1
		const trackMarkers = this.trackMarkers
		this.links.forEach(function (link) {
			pointList.push(new L.LatLng(link.lat, link.lon))
			new L.Marker([link.lat, link.lon], {
				icon: new L.DivIcon({
					className: 'my-div-icon',
					html: '<h4>'+num+'</h4>'
				})
			}).addTo(trackMarkers);
			num ++
		})

		this.trackLine = new L.Polyline(pointList, {
			color: 'red',
			weight: 3,
			opacity: 0.5,
			smoothFactor: 1
		});
		this.trackLine.addTo(this.map);
	}

	addLegend() {
		let linkList = ''
		let num = 1
		this.links.forEach(function (link, i) {
			linkList += '<option value="' + i + '">' + num + ' - ' + link.name + '</option>'
			num ++
		})
		let legend = L.control({position: 'topright'})
		legend.onAdd = function () {
			let div = L.DomUtil.create('div', 'info legend')
			div.innerHTML =''
				+ '<button class="btn btn-sm btn-outline-secondary" id="btnFarm">Farm</button>'
				+ '<button class="btn btn-sm btn-outline-secondary" id="btnLinks">Links</button>'
				+ '<select id="groupSelect" class="selectpicker" data-style="btn-success" data-width="fit">'
				+ linkList
				+ '</select>'
				+ '<button class="btn btn-sm btn-outline-secondary" id="btnNext">Next...</button>'
			div.firstChild.onmousedown = div.firstChild.ondblclick = L.DomEvent.stopPropagation
			L.DomEvent.disableClickPropagation(div)
			return div
		}

		legend.addTo(this.map)

		const self = this
		$('#groupSelect')
			.on('change', function () {
				self.showDestination($(this)
					.val())
			})

		$('#btnFarm').on('click', function () {
			self.toggleMarkers()
		})
		$('#btnLinks').on('click', function () {
			self.toggleTrack()
		})
		$('#btnNext').on('click', function () {
			const select = $('#groupSelect')
			const length = $('#groupSelect option').length
			if (select.val() < length) {
				const newVal = parseInt(select.val())+1
				self.showDestination(newVal)

				select.val(newVal)
			}
		})
	}

	toggleMarkers() {
		if (this.map.hasLayer(this.markers)) {
			this.map.removeLayer(this.markers)
		} else {
			this.map.addLayer(this.markers)
		}
	}

	toggleTrack() {
		if (this.map.hasLayer(this.trackLine)) {
			this.map.removeLayer(this.trackLine)
			this.map.removeLayer(this.trackMarkers)
		} else {
			this.map.addLayer(this.trackLine)
			this.map.addLayer(this.trackMarkers)
		}
	}

	showDestination(id) {
		const destination = this.links[id]
		const center = new L.LatLng(destination.lat, destination.lon)
		this.map.panTo(center)

		const description = destination.desc.replace(/\*BR\*/g, '<br/>')

		if (this.destinationMarker) {
			this.destinationMarker.setLatLng(center)
				.bindPopup('<b>' + destination.name + '</b><br>' +description)
		} else {
			this.destinationMarker = L.marker([destination.lat, destination.lon], {
				// icon: this.icon
			})
				.bindPopup('<b>' + destination.name + '</b><br>' + description)
				.addTo(this.map)
		}
	}

	_initMap() {
		const osmUrl = 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png'
		const osmAttrib = 'Map data (C) <a href="https://openstreetmap.org">OpenStreetMap</a> contributors'
		const osm = new L.TileLayer(osmUrl, {attribution: osmAttrib})

		this.map.addLayer(osm)

		this.map.addLayer(this.trackMarkers)

		L.control.locate().addTo(this.map);
	}
}

let lat = -1.262326
let lon = -79.09357

const map = new Map(lat, lon)

map.displayMaxFieldData($('#jsData').data('maxfield'))
