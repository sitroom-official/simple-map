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

    useEffect( 
        
        function loadUsers() { //this function is the first argument
        if(!usersList?.[0]?.firstName && !isFetching) {
            // your code here
            //this was line 42

           /*probálgatás előtt
            beforeRequestUser();//első
            //valószínülg a fetch datat azzall hívom meg amit láttunk a quizben, azz lesz a masodik
            fetchUserData(userId); //harmadik
            afterReceiveUser(user);// i dont know where im gonna get the user yet probably from fetch
            //probably i need to put  afterReceiveUser(user) into a for loop that loop through
            // the users and pass from userdata array one array elemnt
            //or maybe eleve a fetch után hívom meg a quizes functionba es onna passelek bele
           //uj gondolat
            //mivel 3 fetchet csinálok es ennek after fetch a neve emiat beleteszem a fetch mellé
            //és nem az arrayből rakok ide a parameternek hanem egyből a fetched datat rakom proba
            //and also after recive user and not users shows i should use it after every fetch?
            //az a főbb kérdés, hogy mit kell pontosan belepasszolni
            //a fetched datat vagy abból egy részt?
            

            addMarkerToMap(color, coords);
            //nem tudom pontosan hol hívjam meg, hogy itt vagy egy masik functionbe, még megnézem
            //a user datábol mind a colort mind a coordsot megkapom
            */

            beforeRequestUser();//első

            const usersIds = [{userId : 1}, {userId : 2},{userId : 3}];

           
            
            let allUsersData = [];

            async function doStuff(){
            
                for(let index = 0; index < usersIds.length; index++) {
                    let userId=usersIds[index].userId;
                    try {
            
                        const userData = await fetchUserData(userId);//masodik
            
                        let color=userData.data.color;
                        let coords=userData.data.coords;
                        allUsersData.push(userData);
                        afterReceiveUser(userData);
            
                        addMarkerToMap(color, coords);
            
                    } catch(error) {
            
                        console.log('failed to fetch', userId, error);
            
                    }
            
                }
            
                // if I do console.log(allUsersData ) here it will contain the users information
                console.log(allUsersData );
            }
            
            doStuff();
            



        }
    }, [usersList, isFetching]//this is the second argument
    
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
