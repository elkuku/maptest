class Map {
    constructor(centerLat, centerLon, zoom = 16) {
        this.map = new L.Map('map', {fullscreenControl: true})
        this.map.setView(new L.LatLng(centerLat, centerLon), zoom)

        this.legend = L.control({position: 'topleft'})
        this.markers = L.markerClusterGroup({disableClusteringAtZoom: 16})
        this.trackMarkers = new L.LayerGroup()

        this.links = []

        this.destinationMarker = null
        this.trackLine = null

        this.userPosition = null
        this.destination = null
        this.userDestLine = new L.Polyline([], {
            color: 'blue',
            weight: 3,
            opacity: 0.5,
            smoothFactor: 1
        }).addTo(this.map);

        this.routingControl = L.Routing.control({
            // stepToText: function(){return L.spanish},
            fitSelectedRoutes: false,
            createMarker: function () {
                return false
            }
        }).addTo(this.map);

        this.trackLine = new L.Polyline([], {
            color: 'blue',
            weight: 3,
            opacity: 0.5,
            smoothFactor: 1
        }).addTo(this.map);

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
        this.trackMarkers.clearLayers()
        const trackMarkers = this.trackMarkers
        this.links.forEach(function (link) {
            pointList.push(new L.LatLng(link.lat, link.lon))
            new L.Marker([link.lat, link.lon], {
                icon: new L.DivIcon({
                    className: 'my-div-icon',
                    html: '<h4>' + num + '</h4>'
                })
            }).addTo(trackMarkers);
            num++
        })

        this.trackLine.setLatLngs(pointList);
    }

    addLegend() {
        if (this.map.hasLayer(this.legend)) {
            this.map.removeLayer(this.legend);
        }

        let linkList = '';
        let num = 1
        this.links.forEach(function (link, i) {
            linkList += '<option value="' + i + '">' + num + ' - ' + link.name + '</option>'
            num++
        })

        this.legend.onAdd = function () {
            let div = L.DomUtil.create('div', 'info legend')
            div.innerHTML = ''
                + '<input type="file" id="file-input" /><br>'
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

        this.legend.addTo(this.map)

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
            if (select.val() < length - 1) {
                const newVal = parseInt(select.val()) + 1;
                self.showDestination(newVal);

                select.val(newVal);
            } else {
                alert('Finished :)')
            }
        })

        document.getElementById('file-input')
            .addEventListener('change', this.readSingleFile.bind(this), false);
    }

    readSingleFile(e) {
        const file = e.target.files[0];
        if (!file) {
            return;
        }
        const reader = new FileReader();
        const self = this
        reader.onload = function(e) {
            const contents = e.target.result;
            self.displayContents(contents);
        };
        reader.readAsText(file);
    }

    displayContents(contents) {
        const parser = new DOMParser();
        const xmlDoc = parser.parseFromString(contents,"text/xml");

        const wpts = xmlDoc.getElementsByTagName('wpt');
        const trackpoints = xmlDoc.getElementsByTagName('rtept');

        const waypoints = []
        const track = []

        for (let i = 0; i < wpts.length; i++) {
            waypoints.push({
                lat: wpts[i].getAttribute("lat"),
                lon: wpts[i].getAttribute("lon"),
                name: wpts[i].getElementsByTagName('name')[0].innerHTML,
                desc: wpts[i].getElementsByTagName('desc')[0].innerHTML,
            })
        }

        for (let i = 0; i < trackpoints.length; i++) {
            track.push({
                lat: trackpoints[i].getAttribute("lat"),
                lon: trackpoints[i].getAttribute("lon"),
                name: trackpoints[i].getElementsByTagName('name')[0].innerHTML,
                desc: trackpoints[i].getElementsByTagName('desc')[0].innerHTML,
            })
        }

        const maxfield =  {
            wayPoints: waypoints,
            links: track,
        }

        this.displayMaxFieldData(maxfield)
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

        this.destination = center
        this.map.panTo(center)

        const description = destination.desc.replace(/\*BR\*/g, '<br/>')

        if (this.destinationMarker) {
            this.destinationMarker.setLatLng(center)
                .bindPopup('<b>' + destination.name + '</b><br>' + description)
        } else {
            this.destinationMarker = L.marker([destination.lat, destination.lon], {
                // icon: this.icon
            })
                .bindPopup('<b>' + destination.name + '</b><br>' + description)
                .addTo(this.map)
        }

        // Routing
        if (id > 0) {
            const previous = this.links[id - 1]
            this.routingControl.setWaypoints([
                L.latLng(previous.lat, previous.lon),
                L.latLng(destination.lat, destination.lon)
            ])
        }
    }

    _initMap() {
        const osmUrl = 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png'
        const osmAttrib = 'Map data (C) <a href="https://openstreetmap.org">OpenStreetMap</a> contributors'
        const osm = new L.TileLayer(osmUrl, {attribution: osmAttrib})

        this.map.addLayer(osm)

        this.map.addLayer(this.trackMarkers)

        L.control.locate({
            keepCurrentZoomLevel: true,
            locateOptions: {
                enableHighAccuracy: true
            }
        }).addTo(this.map);


        this.map.on('locationfound', this.onLocationFound.bind(this));
    }

    onLocationFound(e) {
        this.userPosition = e;
        if (this.destination) {
            this.userDestLine.setLatLngs([e.latlng, this.destination])
        }
    }
}

let lat = -1.262326
let lon = -79.09357

const map = new Map(lat, lon)

map.displayMaxFieldData($('#jsData').data('maxfield'))
