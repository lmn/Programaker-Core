import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Collaborator, CollaboratorRole } from 'app/types/collaborator';
import { ApiRoot } from './api-config';
import { ContentType } from './content-type';
import { GroupInfo } from './group';
import { SessionService } from './session.service';

export interface UserAutocompleteInfo {
    id: string,
    username: string,
};

@Injectable()
export class GroupService {
    constructor(
        private http: HttpClient,
        private sessionService: SessionService
    ) {
        this.http = http;
        this.sessionService = sessionService;
    }

    getUserAutocompleteUrl(): string {
        return `${ApiRoot}/utils/autocomplete/users`;
    }

    getCreateGroupUrl(): string {
        return `${ApiRoot}/groups`;
    }

    getGroupInfoUrl(groupName: string): string {
        return `${ApiRoot}/groups/by-name/${groupName}`;
    }

    getGroupCollaboratorsUrl(groupId: string): string {
        return `${ApiRoot}/groups/by-id/${groupId}/collaborators`;
    }

    updateGroupCollaboratorsUrl(groupId: string): string {
        return `${ApiRoot}/groups/by-id/${groupId}/collaborators`;
    }

    getUpdateGroupAvatarUrl(groupId: string): string {
        return `${ApiRoot}/groups/by-id/${groupId}/picture`;
    }

    async getUserGroupsUrl(): Promise<string> {
        const root = await this.sessionService.getApiRootForUserId()
        return `${root}/groups`;
    }

    private _ground(obj: any, field: string){
        if (obj[field] && obj[field].startsWith('/')) {
            obj[field] = ApiRoot + obj[field];
        }

        return obj;
    }

    async autocompleteUsers(query: string): Promise<UserAutocompleteInfo[]> {
        const url = this.getUserAutocompleteUrl();

        const result = await this.http.get(url, {
            headers: this.sessionService.getAuthHeader(),
            params: { q: query },
        }).toPromise();

        return result['users'];
    }

    async createGroup(name: string, options: { 'public': boolean, collaborators: string[] } ): Promise<GroupInfo> {
        const url = this.getCreateGroupUrl();

        const result = await this.http.post(url,
                                            JSON.stringify({
                                                name: name,
                                                'public': options['public'],
                                                collaborators: options.collaborators,
                                            }),
                                            {
                                                headers: this.sessionService.addContentType(
                                                    this.sessionService.getAuthHeader(),
                                                    ContentType.Json)
                                            }).toPromise();

        return result['group'];
    }

    async getUserGroups(): Promise<GroupInfo[]> {
        const url = await this.getUserGroupsUrl();

        const result = await this.http.get(url, { headers: this.sessionService.getAuthHeader()})
            .toPromise();

        return result['groups'].map((group: GroupInfo) => this._ground(group, 'picture'));
    }

    async getGroupWithName(groupName: any): Promise<GroupInfo> {
        const url = await this.getGroupInfoUrl(groupName);

        const result = await this.http.get(url, { headers: this.sessionService.getAuthHeader()})
            .toPromise();

        return result['group'];
    }

    async getCollaboratorsOnGroup(groupId: string): Promise<Collaborator[]> {
        const url = this.getGroupCollaboratorsUrl(groupId);

        const result = await this.http.get(url, { headers: this.sessionService.getAuthHeader()})
            .toPromise();

        return result['collaborators'].map(collaborator => this._ground(collaborator, 'picture'));
    }

    async inviteUsers(groupId: string, userIds: { id: string, role: CollaboratorRole }[]): Promise<void> {
        const url = this.updateGroupCollaboratorsUrl(groupId);

        await (this.http
            .post(url,
                  JSON.stringify({
                      action: 'invite',
                      collaborators: userIds.map(user => {
                          return {
                              id: user.id,
                              role: user.role,
                          }}),
                  }),
                  {headers: this.sessionService.addContentType(this.sessionService.getAuthHeader(),
                                                               ContentType.Json)})
            .toPromise());
    }

    async updateGroupCollaboratorList(groupId: string, userIds: { id: string, role: CollaboratorRole }[]): Promise<void> {
        const url = this.updateGroupCollaboratorsUrl(groupId);
        const operatorId = (await this.sessionService.getSession()).user_id;

        const safeCollaborators: { id: string, role: CollaboratorRole }[] = (userIds
            .map((user) => {
                return {
                    id: user.id,
                    role: user.role,
                }})
            .filter((user) => user.id !== operatorId));
        // Make sure that the operator will always be left as admin to be able
        // to correct potential configuration errors
        safeCollaborators.push({ id: operatorId, role: 'admin'});

        await (this.http
            .post(url,
                  JSON.stringify({
                      action: 'update',
                      collaborators: safeCollaborators
                  }),
                  {headers: this.sessionService.addContentType(this.sessionService.getAuthHeader(),
                                                               ContentType.Json)})
            .toPromise());
    }

    async updateGroupAvatar(groupId: string, image: File): Promise<void> {
        const formData = new FormData();
        formData.append('file', image);

        const url = this.getUpdateGroupAvatarUrl(groupId);

        await this.http.post(url, formData, { headers: this.sessionService.getAuthHeader() }).toPromise()
    }

}
