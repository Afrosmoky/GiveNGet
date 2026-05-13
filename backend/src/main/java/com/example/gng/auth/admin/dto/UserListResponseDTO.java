package com.example.gng.auth.admin.dto;

import java.util.List;

public class UserListResponseDTO {

    private List<UserListDTO> users;
    private long totalElements;
    private int totalPages;
    private int currentPage;
    private int pageSize;

    public UserListResponseDTO() {}

    public UserListResponseDTO(List<UserListDTO> users, long totalElements, int totalPages, int currentPage, int pageSize) {
        this.users = users;
        this.totalElements = totalElements;
        this.totalPages = totalPages;
        this.currentPage = currentPage;
        this.pageSize = pageSize;
    }

    public List<UserListDTO> getUsers() {
        return users;
    }

    public void setUsers(List<UserListDTO> users) {
        this.users = users;
    }

    public long getTotalElements() {
        return totalElements;
    }

    public void setTotalElements(long totalElements) {
        this.totalElements = totalElements;
    }

    public int getTotalPages() {
        return totalPages;
    }

    public void setTotalPages(int totalPages) {
        this.totalPages = totalPages;
    }

    public int getCurrentPage() {
        return currentPage;
    }

    public void setCurrentPage(int currentPage) {
        this.currentPage = currentPage;
    }

    public int getPageSize() {
        return pageSize;
    }

    public void setPageSize(int pageSize) {
        this.pageSize = pageSize;
    }
}
