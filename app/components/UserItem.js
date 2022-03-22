import {html} from '../deps/react.js'

export const UserItem = ({user}) => {
    return html`
    <style>
        .user-info {
            position: relative;
            background: #eee;
            display: block;
            color: #177fbf;
            margin-right: 2rem;
        }
    </style>
    <div class="user-info">
        <h4>User ID: ${user?.userId}</h4>
        <h4>First name: ${user?.firstName}</h4>
        <h4>Last name: ${user?.lastName}</h4>
    </div>`
}