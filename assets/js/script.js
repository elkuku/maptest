class Map {
    constructor(mapId, centerLat = 0, centerLon = 0, zoom = 3) {
        const osmUrl = 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png'
        const osmAttrib = 'Map data (C) <a href="https://openstreetmap.org">OpenStreetMap</a> contributors'

        const mbAttr = 'Map data &copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors, ' +
                'Imagery © <a href="https://www.mapbox.com/">Mapbox</a>',
            mbUrl = 'https://api.mapbox.com/styles/v1/{id}/tiles/{z}/{x}/{y}?access_token=pk.eyJ1IjoibWFwYm94IiwiYSI6ImNpejY4NXVycTA2emYycXBndHRqcmZ3N3gifQ.rJcFIG214AriISLbB6B5aw';

        const grayscale = L.tileLayer(mbUrl, {
                id: 'mapbox/light-v9',
                tileSize: 512,
                zoomOffset: -1,
                attribution: mbAttr
            }),
            streets = L.tileLayer(mbUrl, {
                id: 'mapbox/streets-v11',
                tileSize: 512,
                zoomOffset: -1,
                attribution: mbAttr
            }),
            OSM = L.tileLayer(osmUrl, {attribution: osmAttrib});

        this.farmLayer = new L.FeatureGroup()
        this.linkLayer = new L.LayerGroup()
        this.links = []

        this.map = L.map(mapId, {
            center: [centerLat, centerLon],
            zoom: zoom,
            layers: [grayscale, this.farmLayer, this.linkLayer],
            fullscreenControl: true
        });

        this.addFileInputControl()

        const baseLayers = {
            "Grayscale": grayscale,
            "Streets": streets,
            "OSM": OSM
        };

        const overlays = {
            "Farm": this.farmLayer,
            "Links": this.linkLayer,
        };

        L.control.layers(baseLayers, overlays).addTo(this.map);

        this.linkSelector = L.control({position: 'bottomleft'})

        this.destinationMarker = L.marker([0, 0]).bindPopup('Please load a GPX file...')
        this.userDestinationLine = new L.Polyline([], {
            color: 'blue',
            weight: 3,
            opacity: 0.5,
            smoothFactor: 1
        })

        // Locate control
        L.control.locate({
            keepCurrentZoomLevel: true,
            locateOptions: {
                enableHighAccuracy: true
            }
        }).addTo(this.map);

        this.map.on('locationfound', this.onLocationFound.bind(this));

        // Routing control
        this.routingControl = L.Routing.control({
            // stepToText: function(){return L.spanish},
            fitSelectedRoutes: false,
            createMarker: function () {
                return false
            }
        }).addTo(this.map);

        this.destinationMarker.addTo(this.map)
        this.userDestinationLine.addTo(this.map)
    }

    addFileInputControl() {
        const legend = L.control({position: 'topright'})

        legend.onAdd = function () {
            let div = L.DomUtil.create('div', 'info legend')
            div.innerHTML = '<input type="file" id="file-input" /><br>'
            div.firstChild.onmousedown = div.firstChild.ondblclick = L.DomEvent.stopPropagation
            L.DomEvent.disableClickPropagation(div)
            return div
        }

        legend.addTo(this.map)

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
        reader.onload = function (e) {
            const contents = e.target.result;
            self.parseGpx(contents);
        };
        reader.readAsText(file);
    }

    parseGpx(contents) {
        const parser = new DOMParser();
        const xmlDoc = parser.parseFromString(contents, "text/xml");

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

        const maxfield = {
            wayPoints: waypoints,
            links: track,
        }

        this.displayMaxFieldData(maxfield)
    }

    displayMaxFieldData(maxField) {
        this.links = maxField.links

        this.loadFarmLayer(maxField.wayPoints)
        this.loadLinkLayer()

        this.addLinkSelector()
    }

    loadFarmLayer(markerObjects) {
        this.farmLayer.clearLayers()

        const markers = this.farmLayer
        markerObjects.forEach(function (o) {
            const num = o.desc.replace('Farm keys:', '')
            let marker =
                new L.Marker(
                    new L.LatLng(o.lat, o.lon),
                    {
                        icon: new L.DivIcon({
                            className: 'farm-layer',
                            html: '<b class="circle">' + num + '</b>'
                        })
                    }
                ).bindPopup('<b>' + o.name + '</b><br>' + o.desc)
            markers.addLayer(marker)
        })

        this.map.fitBounds(this.farmLayer.getBounds());
    }

    loadLinkLayer() {
        let pointList = []
        let num = 1
        this.linkLayer.clearLayers()
        this.links.forEach(function (link) {
            pointList.push(new L.LatLng(link.lat, link.lon))
            const description = link.desc.replace(/\*BR\*/g, '<br/>')

            new L.Marker([link.lat, link.lon], {
                icon: new L.DivIcon({
                    className: 'my-div-icon',
                    html: '<b class="circle">' + num + '</b>'
                })
            })
                .bindPopup('<b>' + link.name + '</b><br/>' + description)
                .addTo(this.linkLayer);
            num++
        }.bind(this))

        L.polyline(pointList, {
            color: 'blue',
            weight: 3,
            opacity: 0.5,
            smoothFactor: 1
        }).addTo(this.linkLayer);
    }

    addLinkSelector(links) {
        if (this.map.hasLayer(this.linkSelector)) {
            this.map.removeLayer(this.linkSelector);
        }

        let linkList = '<option value="-1">Start...</option>'
        let num = 1
        this.links.forEach(function (link, i) {
            linkList += '<option value="' + i + '">' + num + ' - ' + link.name + '</option>'
            num++
        })

        this.linkSelector.onAdd = function () {
            let div = L.DomUtil.create('div', 'info legend')
            div.innerHTML = ''
                + '<button id="btnNext">Next...</button>'
                + '<select id="groupSelect">'
                + linkList
                + '</select>'
            div.firstChild.onmousedown = div.firstChild.ondblclick = L.DomEvent.stopPropagation
            L.DomEvent.disableClickPropagation(div)
            return div
        }

        this.linkSelector.addTo(this.map)

        $('#groupSelect')
            .on('change', function (e) {
                this.showDestination($(e.target).val())
            }.bind(this))

        $('#btnNext').on('click', function () {
            const select = $('#groupSelect')
            const length = $('#groupSelect option').length
            if (select.val() < length - 2) {
                const newVal = parseInt(select.val()) + 1;
                this.showDestination(newVal);

                select.val(newVal);
            } else {
                alert('Finished :)')
            }
        }.bind(this))
    }

    showDestination(id) {
        if (id < 0) {
            this.destinationMarker.setLatLng([0, 0])
                .bindPopup('')
            this.destination = null
            return
        }

        const destination = this.links[id];
        this.destination = new L.LatLng(destination.lat, destination.lon)

        this.map.panTo(this.destination)

        const description = destination.desc.replace(/\*BR\*/g, '<br/>')

        this.destinationMarker.setLatLng(this.destination)
            .bindPopup('<b>' + destination.name + '</b><br>' + description)

        // Routing
        if (id > 0) {
            const previous = this.links[id - 1]
            this.routingControl.setWaypoints([
                L.latLng(previous.lat, previous.lon),
                L.latLng(destination.lat, destination.lon)
            ])
        }
    }

    onLocationFound(e) {
        if (this.destination) {
            this.userDestinationLine.setLatLngs([e.latlng, this.destination])
        }
    }
}

const map = new Map('map')