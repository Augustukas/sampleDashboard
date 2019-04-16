package lt.firm.product.mapper;

import lt.firm.product.domain.DashboardKpiView;
import lt.firm.product.models.Controller.Dashboard.DashboardKpiViewTemplatesWithExcludedKpi;
import lt.firm.product.models.Mapper.DashboardKpiView.DashboardKpiViewPersonToTemplateMap;
import lt.firm.product.models.Mapper.DashboardKpiView.ExcludedKpiItem;
import org.apache.ibatis.annotations.*;
import org.apache.ibatis.mapping.StatementType;
import org.springframework.stereotype.Repository;

import java.util.List;

/**
 */

@Repository
public interface DashboardKpiViewMapper {

    @Select("SELECT t.excludedRatioId FROM tbldashboardkpiview as dkv " +
            "LEFT JOIN tbldashboardkpiviewtemplate AS t ON t.dashboardKpiViewId = dkv.id " +
            "WHERE dkv.personId = #{personId} AND dkv.templateName = #{templateName}")
    public List<Integer> getExcludedKpiIdsByPersonAndTemplateName(@Param("personId")long personId, @Param("templateName") String templateName);


    @Select("SELECT dkv.id, dkv.personId, dkv.templateName, dkv.type FROM tbldashboardkpiview as dkv " +
            "WHERE dkv.personId = #{personId}")
    public List<DashboardKpiView> getExcludedKpiTemplateNamesByPerson(@Param("personId")long personId);

    //@Select("SELECT dkv.id, dkv.personId, dkv.templateName, dkv.type FROM tbldashboardkpiview as dkv " +
      //      "WHERE dkv.personId = #{personId} AND dkv.type = #{type} ")
    public List<DashboardKpiViewTemplatesWithExcludedKpi> getExcludedKpiTemplateNamesByPersonAndType(@Param("personId")long personId, @Param("type") String type);

    @Select("SELECT t.excludedRatioId  FROM tbldashboardkpiview as dkv " +
            "LEFT JOIN tbldashboardkpiviewtemplate AS t ON t.dashboardKpiViewId = dkv.id " +
            "WHERE dkv.personId = #{personId} AND dkv.type ='personal'")
    public List<Integer> getExcludedKpiIdsDefaultTemplateByPerson(@Param("personId")long personId);

    @Delete("DELETE tbldashboardkpiview, tbldashboardkpiviewtemplate FROM tbldashboardkpiview, tbldashboardkpiviewtemplate " +
            "WHERE tbldashboardkpiview.personId = #{personId} " +
            "AND tbldashboardkpiview.id = #{id} " +
            "AND tbldashboardkpiview.id = tbldashboardkpiviewtemplate.dashboardKpiViewId ")
    public int removeElements(@Param("personId")long personId, @Param("id")int id);

    @Insert("INSERT INTO tbldashboardkpiview (personId, templateName, type) VALUES (#{personId}, #{templateName}, #{type})")
    @Options(useGeneratedKeys = true, keyProperty="id")
    public int insertDashboardViewData(DashboardKpiView item);

    public void insertTemplateData(@Param("excludedKpiItems")List<ExcludedKpiItem> excludedKpiItems);

    //=======================================================================================================
    @Select("SELECT count(*) FROM tbldashboardkpiviewpersontotemplatemap WHERE personId = #{personId}")
    public int existsPersonRecordInDashboardKpiViewPersonToTemplateMap (@Param("personId") long personId);

    @Insert("INSERT INTO tbldashboardkpiviewpersontotemplatemap (personId, dashboardKpiViewId) VALUES " +
            "(#{personId}, #{dashboardKpiViewId}) ")
    public int insertPerson2TemplateData(@Param("personId") long personId, @Param("dashboardKpiViewId") int dashboardKpiViewId);

    @Update("UPDATE tbldashboardkpiviewpersontotemplatemap SET dashboardKpiViewId=#{dashboardKpiViewId} WHERE id = #{id}")
    public void updatePerson2TemplateData(@Param("id")long id, @Param("dashboardKpiViewId")int dashboardKpiViewId);

    @Update("UPDATE tbldashboardkpiviewpersontotemplatemap SET dashboardKpiViewId=#{dashboardKpiViewId} WHERE personId = #{personId}")
    public void updatePerson2TemplateDataByPersonId(@Param("personId")long personId, @Param("dashboardKpiViewId")int dashboardKpiViewId);

    @Select("Select * FROM tbldashboardkpiviewpersontotemplatemap WHERE id = #{id}")
    public DashboardKpiViewPersonToTemplateMap selectPerson2TemplateDataById(@Param("id")long id);

    @Select("Select * FROM tbldashboardkpiviewpersontotemplatemap WHERE personId = #{personId}")
    public DashboardKpiViewPersonToTemplateMap selectPerson2TemplateDataByPersonId(@Param("personId")long personId);



    @Delete("DELETE FROM tbldashboardkpiviewpersontotemplatemap WHERE id = #{id}")
    public void deletePerson2TemplateData(@Param("id")long id);

    @Delete("DELETE FROM tbldashboardkpiviewpersontotemplatemap WHERE personId = #{personId}")
    public void deletePerson2TemplateDataByPersonId(@Param("personId")long personId);

    @Delete("DELETE FROM tbldashboardkpiviewtemplate WHERE dashboardKpiViewId = #{dashboardKpiViewId}")
    public void deleteDashboardKpiViewTemplateByDashboardKpiViewId(@Param("dashboardKpiViewId")long dashboardKpiViewId);



}
