import React, { Component } from 'react';
import io from 'socket.io-client';
import User from '../../Models/user.model';
import Message from '../../Models/message.model';
import './styles.css';

import Chat from '../chat/chat.component';
import UserList from '../../components/user-list/user-list.component';
import MenuBar from '../../components/header/header.component';
import _ from 'lodash';

function checkIfUserPresent(user, userList) {
    return userList.find(u => u._id === user._id);
}

class Welcome extends Component {

    constructor(props) {
        super(props);

        const socket = io('http://localhost:8000', {
            query: {
                user: localStorage.getItem('user')
            },
            reconnection: true
        });

        this.state = {
            socket,
            users: [],
            currentUser: JSON.parse(localStorage.getItem('user')),
            selectedUserIndex: null
        }
    }

    onNewMessage(msg, from) {
        let usersClone = JSON.parse(JSON.stringify(this.state.users));
        let targetUser = usersClone.find(user => user._id === from._id);
        targetUser.messageList.push(new Message(msg, from, new Date(), false));
        if (this.state.selectedUserIndex === null || targetUser._id !== usersClone[this.state.selectedUserIndex]._id) {
            targetUser.hasNewMessages = true;
            this.props.notify.openSnackbar(`New message from ${from.nickname}`);
        }
        this.setState({ users: usersClone });
    }

    async componentDidMount() {
        this.state.socket.emit('GET_ONLINE_USER_LIST', (users) => {
            users = users.filter(user => !_.isEqual(user, this.state.currentUser))
                .map(user => new User(user));

            this.setState({ users });
        })

        this.state.socket.on('USER_LIST_UPDATE', (user) => {
            if (!_.isEqual(user, this.state.currentUser)) {
                //To check for similiar users on browser refresh
                if (!checkIfUserPresent(user, this.state.users)) {
                    this.setState({
                        users: [...this.state.users, new User(user)]
                    })
                }
            }
        })

        this.state.socket.on('PRIVATE_MESSAGE', ((msg, from) => {
            this.onNewMessage(msg, from);
        }).bind(this));
    }

    componentWillUnmount() {
        this.state.socket.emit('disconnect');
    }

    userSelected = (selectedUserIndex) => {
        let usersClone = JSON.parse(JSON.stringify(this.state.users));
        usersClone[selectedUserIndex].hasNewMessages = false;
        this.setState({users: usersClone, selectedUserIndex });
    }

    sendMessage = (msg) => {
        let usersClone = JSON.parse(JSON.stringify(this.state.users));
        usersClone[this.state.selectedUserIndex].messageList.push(new Message(msg, null, new Date()));
        this.setState({ users: usersClone });
        this.state.socket.emit('CREATE_CHAT_ROOM', this.state.users[this.state.selectedUserIndex], msg)
    }

    render() {
        const { socket, users, currentUser, selectedUserIndex } = this.state;
        const selectedUser = users[selectedUserIndex];

        return (
            <div className="container-fluid">
                <div className="row users-column">
                    <div className="col-md-4">
                        <MenuBar currentUser={currentUser} />
                        <UserList users={users} onUserSelected={this.userSelected} />
                    </div>
                    {selectedUser ?
                        <div className="col-md-8">
                            <Chat selectedUser={selectedUser} onSendMessage={this.sendMessage} />
                        </div> : null
                    }
                </div>
            </div>
        );
    }
}

export default Welcome;