export const initialState = {
    isFetching: false,
    users: {
        "1": {userId: "1"},
        "2": {userId: "2"},
        "3": {userId: "3"}
    }
}

export const reducer = (state, action) => {
    switch (action.type) {
        case 'REQUEST_USER':
            return {
                ...state,
                isFetching: true,
            }
        case 'RECEIVED_USER':
            console.log(action)
            return {
                ...state,
                isFetching: false,
                users: {
                    ...state.users,
                    [action.user.userId]: action.user
                }
            }
    }
}