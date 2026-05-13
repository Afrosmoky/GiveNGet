package com.example.gng.auth.admin.dto;

public class UserStatsDTO {

    private UserCountStats totalUsers;
    private UserCountStats companies;
    private RegistrationStats registrations;

    public UserStatsDTO() {}

    public UserStatsDTO(UserCountStats totalUsers, UserCountStats companies, RegistrationStats registrations) {
        this.totalUsers = totalUsers;
        this.companies = companies;
        this.registrations = registrations;
    }

    public UserCountStats getTotalUsers() {
        return totalUsers;
    }

    public void setTotalUsers(UserCountStats totalUsers) {
        this.totalUsers = totalUsers;
    }

    public UserCountStats getCompanies() {
        return companies;
    }

    public void setCompanies(UserCountStats companies) {
        this.companies = companies;
    }

    public RegistrationStats getRegistrations() {
        return registrations;
    }

    public void setRegistrations(RegistrationStats registrations) {
        this.registrations = registrations;
    }

    public static class UserCountStats {
        private long total;
        private long active;
        private long banned;

        public UserCountStats() {}

        public UserCountStats(long total, long active, long banned) {
            this.total = total;
            this.active = active;
            this.banned = banned;
        }

        public long getTotal() {
            return total;
        }

        public void setTotal(long total) {
            this.total = total;
        }

        public long getActive() {
            return active;
        }

        public void setActive(long active) {
            this.active = active;
        }

        public long getBanned() {
            return banned;
        }

        public void setBanned(long banned) {
            this.banned = banned;
        }
    }

    public static class RegistrationStats {
        private long daily;
        private long weekly;
        private long monthly;

        public RegistrationStats() {}

        public RegistrationStats(long daily, long weekly, long monthly) {
            this.daily = daily;
            this.weekly = weekly;
            this.monthly = monthly;
        }

        public long getDaily() {
            return daily;
        }

        public void setDaily(long daily) {
            this.daily = daily;
        }

        public long getWeekly() {
            return weekly;
        }

        public void setWeekly(long weekly) {
            this.weekly = weekly;
        }

        public long getMonthly() {
            return monthly;
        }

        public void setMonthly(long monthly) {
            this.monthly = monthly;
        }
    }
}
