import { html, render, useEffect, useReducer } from './deps/react.js'
import {reducer, initialState} from './state.js'
import {UserItem} from "./components/UserItem.js";

mapboxgl.accessToken = 'pk.eyJ1IjoibWlzdGVyZnJlc2giLCJhIjoiYlFEbUhkYyJ9.zW0qmGPMmZsKPmmPwz2F1w';
const map = new mapboxgl.Map({
    container: 'map',
    style: 'mapbox://styles/mapbox/streets-v11',
    center: [1.89043, 48.78886],
    zoom: 13
});

const addMarkerToMap = (color, coords) => {
    return new mapboxgl.Marker({ color: color })
        .setLngLat(coords)
        .addTo(map);
}

const App = () => {
    const [state, dispatch] = useReducer(reducer, initialState)
    const fetchUserData = (userId) => fetch(`http://localhost:8080/user/${userId}`).then(res => res.json())

    const users = state?.users ?? {}
    const isFetching = state?.isFetching
    const usersList = Object.values(users)

    const beforeRequestUser = () => {
        dispatch({
            type: 'REQUEST_USER',
        })
    }
    const afterReceiveUser = (user) => {
        dispatch({
            type: 'RECEIVED_USER',
            user: user,
        })
    }

    useEffect( function loadUsers() { 
        if(!usersList?.[0]?.firstName && !isFetching) {
            
            beforeRequestUser();

            const usersIds = [{userId : 1}, {userId : 2},{userId : 3}];

            async function loopThroughUsersIdsAndFetchUserData(){
            
                for(let index = 0; index < usersIds.length; index++) {
                    const userId=usersIds[index].userId;
                    try {
            
                        const userData = await fetchUserData(userId);
                        const color=userData.data.color;
                        const coords=userData.data.coords;
                        afterReceiveUser(userData);
                        addMarkerToMap(color, coords);
            
                    } catch(error) {
            
                        console.log('failed to fetch', userId, error);
            
                    }
                }
            
            }
            
            loopThroughUsersIdsAndFetchUserData();
            
        }
    }, [usersList, isFetching]
    )

    return html`
    <style>
        #simple-ui {
            position: fixed;
            background: #eee;
            top: 1rem;
            left: 1rem;
            z-index: 100;
            pointer-events: auto;
            min-width: 30rem;
            color:#15a334;
        }
        #users-list {
            display: flex;
            flex-direction: column;
            justify-content: center;
            align-items: center;
        }
    </style>
    <div id="simple-ui">
        <h3> Simple UI </h3>
        <div id="users-list">
            ${usersList.map( user => html`<${UserItem} user=${user}/>`)}
        </div>
    </div>`
}

render(html`<${App} />`, document.getElementById('app-mount'))
