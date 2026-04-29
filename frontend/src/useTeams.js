import { useState, useEffect, useCallback } from "react";
import { fetchMyTeams, fetchTeamMembers } from "./api";

export default function useTeams() {
  const [teams, setTeams] = useState([]);
  const [isLoadingTeams, setIsLoadingTeams] = useState(true);
  const [teamsError, setTeamsError] = useState(null);

  const loadTeams = useCallback(async () => {
    setIsLoadingTeams(true);
    setTeamsError(null);
    try {
      const data = await fetchMyTeams();
      setTeams(data);
    } catch (err) {
      setTeamsError(err.message);
    } finally {
      setIsLoadingTeams(false);
    }
  }, []);

  useEffect(() => {
    loadTeams();
  }, [loadTeams]);

  return { teams, isLoadingTeams, teamsError, reloadTeams: loadTeams };
}
