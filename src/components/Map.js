import React, {useEffect, useState} from 'react';
import {GeoJSON, MapContainer, Polyline, TileLayer, Tooltip} from 'react-leaflet';
import './Map.css';

import Leaflet from 'leaflet';
import Icon from 'leaflet/dist/images/marker-icon.png';
import IconShadow from 'leaflet/dist/images/marker-shadow.png';

let DefaultIcon = Leaflet.icon({
    iconUrl: Icon,
    shadowUrl: IconShadow,
    iconSize: [18, 30],
    iconAnchor: [9, 30],
    shadowSize: [30, 30]
});
Leaflet.Marker.prototype.options.icon = DefaultIcon;

const getFixedColor = (index) => {
    const colors = [
        '#FF5733', // 赤
        '#33FF57', // 緑
        '#3357FF', // 青
        '#FF33A1', // ピンク
        '#A133FF', // 紫
        '#33FFF5', // シアン
        '#F5FF33', // 黄色
        '#FF8C33', // オレンジ
        '#8C33FF', // 濃い紫
        '#33FF8C'  // ライトグリーン
    ];
    return colors[index % colors.length];
};

export const Map = () => {
    const position = [35.452725, 139.595061]; // Yokohama City
    const zoom = 14;
    const [geoData, setGeoData] = useState(null);
    const [lineStrings, setLineStrings] = useState([]);

    useEffect(() => {
        fetch('/yokohama_city_geojson.json')
            .then(response => {
                if (!response.ok) {
                    throw new Error('Network response was not ok');
                }
                return response.json();
            })
            .then(data => setGeoData(data))
            .catch(error => {
                console.error('There was a problem with the fetch operation:', error);
            });
    }, []);

    // useEffect(() => {
    //     console.log(lineStrings);
    // }, [lineStrings]);

    const onEachFeature = (feature, layer) => {
        if (feature.properties && feature.properties.stop_name && feature.properties.route_names) {
            const popupContent = `
            <table>
                <tr><th>バス停留所</th><td>${feature.properties.stop_name}</td></tr>
                <tr><th>系統</th><td>
                    <ul>
                        ${feature.properties.route_names.map(route_name => `${route_name}`).join('<br>')}
                    </ul>
                </td></tr>
            </table>
            `;
            layer.bindPopup(popupContent);

            layer.on('click', function () {
                const fetchPromises = feature.properties.route_ids.map(route_id => {
                    return fetch('./routes/route_id_' + route_id + '.json')
                        .then(response => {
                            if (!response.ok) {
                                throw new Error('Network response was not ok');
                            }
                            return response.json();
                        });
                });

                Promise.all(fetchPromises)
                    .then(newLineStrings => {
                        setLineStrings(newLineStrings.map(lineString => ({
                            ...lineString,
                            color: getFixedColor(lineString.properties.route_id)
                        })));
                    })
                    .catch(error => {
                        console.error('There was a problem with the fetch operation:', error);
                    });
            });
        }
    };
    return (
        <MapContainer center={position} zoom={zoom} >

            <TileLayer
                attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            />
            {
                geoData && <GeoJSON data={geoData} onEachFeature={onEachFeature}/>
            }
            {
                lineStrings.map((lineString, index) => (
                    <React.Fragment key={lineString.properties.route_id}>
                        <GeoJSON
                            data={lineString}
                            style={{color: lineString.color}}
                            onEachFeature={(feature, layer) => {
                                const popupContent = `<p>系統: ${lineString.properties.route_id}</p>`;
                                layer.bindPopup(popupContent);
                            }}
                        />
                        <Polyline
                            positions={lineString.geometry.coordinates.map(coord => [coord[1], coord[0]])}
                            color={lineString.color}>
                            <Tooltip direction="center" offset={[0, 0]} opacity={1} permanent>
                                <span>系統: {lineString.properties.route_id}</span>
                            </Tooltip>
                        </Polyline>
                    </React.Fragment>
                ))
            }
        </MapContainer>
    );
};
