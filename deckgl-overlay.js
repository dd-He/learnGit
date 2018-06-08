import React, {Component} from 'react';
import DeckGL, {LineLayer, ScatterplotLayer,PolygonLayer,HexagonLayer} from 'deck.gl';
import {setParameters} from 'luma.gl';
import TripsLayer from './trips-layer';

const LIGHT_SETTINGS = {
    lightsPosition: [-74.05, 40.7, 8000, -73.5, 41, 5000],
    ambientRatio: 0.05,
    diffuseRatio: 0.6,
    specularRatio: 0.8,
    lightsStrength: [2.0, 0.0, 0.0, 0.0],
    numberOfLights: 2
};

//const LIGHT_SETTINGS = {
//    lightsPosition: [-0.144528, 49.739968, 8000, -3.807751, 54.104682, 8000],
//    ambientRatio: 0.4,
//    diffuseRatio: 0.6,
//    specularRatio: 0.2,
//    lightsStrength: [0.8, 0.0, 0.8, 0.0],
//    numberOfLights: 2
//};

function getColor(d) {
    const z = d.start[0];
    const r = z / 100;

    return [255 * (2 - r), 128 * (r - 1), 255 * (r - 1), r -1];
}

function getSize(type) {
    if (type.search('major') >= 0) {
        return 100;
    }
    if (type.search('small') >= 0) {
        return 30;
    }
    return 60;
}

const colorRange = [
    [255, 255, 0],
    [255, 110, 180],
    [255, 20, 147],
    [205, 16, 118],
    [205, 16, 118],
    [255, 0, 0]
];

//const elevationScale = {min: 1, max: 50};
const elevationScale = {min: 1, max: 3};

const defaultProps = {
    //radius: 1000,
    radius: 300,
    upperPercentile: 100,
    coverage: 1
};

export default class DeckGLOverlay extends Component {

    static get defaultColorRange() {
        return colorRange;
    }

    static get defaultViewport() {
        return {
            longitude: 114.28321838378906,
            latitude: 30.54302215576172,
            //longitude: -1.4157267858730052,
            //latitude: 52.232395363869415,
            zoom: 12,
            //  zoom: 13,
            maxZoom: 16,
            pitch: 45,
            bearing: 0
        };
    }
    constructor(props) {
        super(props);
        this.startAnimationTimer = null;
        this.intervalTimer = null;
        this.state = {
            elevationScale: elevationScale.min
        };

        this._startAnimate = this._startAnimate.bind(this);
        this._animateHeight = this._animateHeight.bind(this);

    }

    componentDidMount() {
        this._animate();
    }

    componentWillReceiveProps(nextProps) {
        if (nextProps.data.length !== this.props.data.length) {
            this._animate();
        }
    }

    componentWillUnmount() {
        this._stopAnimate();
    }

    _animate() {
        this._stopAnimate();

        // wait 1.5 secs to start animation so that all data are loaded
        this.startAnimationTimer = window.setTimeout(this._startAnimate, 1500);
    }

    _startAnimate() {
        this.intervalTimer = window.setInterval(this._animateHeight, 20);
    }

    _stopAnimate() {
        window.clearTimeout(this.startAnimationTimer);
        window.clearTimeout(this.intervalTimer);
    }

    _animateHeight() {
        if (this.state.elevationScale === elevationScale.max) {
            this._stopAnimate();
        } else {
            this.setState({elevationScale: this.state.elevationScale + 1});
        }
    }

    _initialize(gl) {
        setParameters(gl, {
            depthTest: true,
            depthFunc: gl.LEQUAL
        });
    }
    //  _initialize(gl) {
    //      gl.enable(gl.DEPTH_TEST);
    //      gl.depthFunc(gl.LEQUAL);
    //  }

    render() {
        const {viewport, data, radius, coverage, upperPercentile, flightPaths, airports, strokeWidth, buildings, trips, trailLength, time} = this.props;

        if (!data || !flightPaths || !airports || !buildings || !trips) {
            return null;
        }

        const layers = [
            new HexagonLayer({
                id: 'heatmap',
                colorRange,
                coverage,
                data,
                elevationRange: [0, 3000],
                elevationScale: this.state.elevationScale,
                extruded: true,
                getPosition: d => d,
                lightSettings: LIGHT_SETTINGS,
                onHover: this.props.onHover,
                //opacity: 0.03,
                opacity: 1,
                pickable: Boolean(this.props.onHover),
                radius,
                upperPercentile
            }),
            new ScatterplotLayer({
                id: 'airports',
                data: airports,
                radiusScale: 20,
                getPosition: d => d.coordinates,
                getColor: d => [255, 140, 0],
                getRadius: d => getSize(d.type),
                pickable: Boolean(this.props.onHover),
                onHover: this.props.onHover
            }),
            new LineLayer({
                id: 'flight-paths',
                data: flightPaths,
                opacity: 0.4,
                strokeWidth:1,
                fp64: false,
                getSourcePosition: d => d.start,
                getTargetPosition: d => d.end,
                getColor: d => [252, 181, 37],
                //getColor: d => [253, 128, 93],
                //getColor: d => [252,181,37],
                pickable: Boolean(this.props.onHover),
                onHover: this.props.onHover
            }),
            new TripsLayer({
                id: 'trips',
                data: trips,
                getPath: d => d.segments,
                //getColor: d => d.vendor === 0 ? [253, 128, 93] : [23, 184, 190],
                getColor: d => d.vendor === 0 ? [255, 255, 255] : [23, 184, 190],
                opacity: 1,
                strokeWidth: 8,
                trailLength,
                currentTime: time
            }),
            new PolygonLayer({
                id: 'buildings',
                data: buildings,
                extruded: true,
                wireframe: false,
                fp64: true,
                opacity: 0.5,
                getPolygon: f => f.polygon,
                getElevation: f => f.height,
                getFillColor: f => [74, 80, 87],
                lightSettings: LIGHT_SETTINGS
            })
        ];

        return (
            <DeckGL {...viewport} layers={this.props.layer} onWebGLInitialized={this._initialize} />
    );
    }
}

DeckGLOverlay.displayName = 'DeckGLOverlay';
DeckGLOverlay.defaultProps = defaultProps;
