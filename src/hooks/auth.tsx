import React, { createContext, ReactNode, useContext, useState, useEffect } from 'react'
import * as AuthSession from 'expo-auth-session'
import AsyncStorage from '@react-native-async-storage/async-storage'
const { SCOPE } = process.env  
const { CLIENT_ID } = process.env
const { CDN_IMAGE } = process.env  
const { REDIRECT_URI } = process.env 
const { RESPONSE_TYPE } = process.env
import { api } from '../services/api'
import { COLLECTION_USER } from '../configs/database'
type User = {
    id: string
    username: string
    firstName: string
    avatar: string
    email: string
    token: string
}

type AuthorizationResponse = AuthSession.AuthSessionResult & {
    params: {
        access_token?: string
        error?: string
    }
}

type AuthContextData ={
    user: User
    loading: boolean
    signIn: () => Promise<void>
}

type AuthProviderProps = {
    children: ReactNode
}
const AuthContext = createContext({} as AuthContextData)

function AuthProvider({children}: AuthProviderProps){
    const [user, setUSer] = useState<User>({} as User)
    const [loading, setLoading] = useState(false) 

    async function signIn(){
        try{
            setLoading(true)
            const authUrl = `${api.defaults.baseURL}/oauth2/authorize?client_id=${CLIENT_ID}&redirect_uri=${REDIRECT_URI}&response_type=${RESPONSE_TYPE}&scope=${SCOPE}`
            const {type, params } = await AuthSession
            .startAsync({ authUrl }) as AuthorizationResponse

            if(type === 'success' && !params.error){
                api.defaults.headers.authorization = `Bearer ${params.access_token}`

                const userInfo = await api.get('/users/@me')
                
                const firstName = userInfo.data.username.split(' ')[0]
                userInfo.data.avatar = `${CDN_IMAGE}/avatars/${userInfo.data.id}/${userInfo.data.avatar}.png`
                const userData={
                    ...userInfo.data,
                    firstName,
                    token: params.access_token
                }

                await AsyncStorage.setItem(COLLECTION_USER, JSON.stringify(userData))
                
                setUSer(userData)
            }

        }catch{
            throw new Error("Não foi possivel autenticar")
        }finally{
            setLoading(false)
        }
    }

    const loadUserStorageData = async () =>{
        const storage = await AsyncStorage.getItem(COLLECTION_USER)

        if(storage){
            const userLogged = JSON.parse(storage) as User
            api.defaults.headers.authorization = `Bearer ${userLogged.token}`
            setUSer(userLogged)
        }
    }

    useEffect(() =>{
        loadUserStorageData()
    },[])

    return(
    <AuthContext.Provider value={{user, signIn, loading}}>
        { children }
    </AuthContext.Provider>
   )
}

function useAuth() {
    const context = useContext(AuthContext)
    return context
}

export {AuthProvider, useAuth}