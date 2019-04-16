package lt.firm.product.web;

import com.fasterxml.jackson.core.JsonProcessingException;
import lt.firm.product.config.SecurityConfiguration;
import lt.firm.product.mapper.*;
import lt.firm.product.models.Controller.Dashboard.*;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;
import java.util.*;

@PreAuthorize("isAuthenticated()")
@RestController
public class DashboardController {

    @Autowired
    DashboardKpiViewMapper dashboardKpiViewMapper;

    @Autowired
    DashboardModel dashboardModel;


    @RequestMapping("/dashboard/plantid/{plantId}/year/{year}/planttype/{plantTypeId}/region/{regionId}/cbutype/{cbuId}/templateId/{templateId}")
    public Map<Integer, AggregateRatioContainer> getSinglePlantDashboardData(
            @PathVariable("plantId") Integer plantId,
            @PathVariable("year") Integer year,
            @PathVariable("plantTypeId") Integer plantTypeId,
            @PathVariable("regionId") Integer regionId,
            @PathVariable("cbuId") Integer cbuId,
            @PathVariable("templateId") Integer templateId,
            @AuthenticationPrincipal SecurityConfiguration.PersonUserDetails principal
    ) throws JsonProcessingException {
        if (plantId > 0)
            return dashboardModel.calculatePlantAllKpis(plantId, year - 1, principal, templateId);
        else if (plantTypeId > 0 || regionId > 0 || cbuId > 0) {
            return dashboardModel.calculateByFilter(year - 1, plantTypeId, regionId, cbuId, templateId);
        }
        return new HashMap<>();
    }

    @RequestMapping(value = "/dashboardkpiviewexcludedkpi", method = RequestMethod.GET)
    public List<Integer> getExcludedKpis(@AuthenticationPrincipal SecurityConfiguration.PersonUserDetails principal) throws InterruptedException {

        return dashboardKpiViewMapper.getExcludedKpiIdsDefaultTemplateByPerson(principal.person.getId());
    }

    @RequestMapping(value = "/dashboardkpiviewsaveexcludedkpis/{templateName}/{type}", method = RequestMethod.POST)
    public HttpStatus saveExcludedKpi(@RequestBody List<Integer> items,
                                      @AuthenticationPrincipal SecurityConfiguration.PersonUserDetails principal,
                                      @PathVariable("templateName") String templateName,
                                      @PathVariable("type") String type) {

        type = "personal"; // enforce personal templates only for now
        long personId = principal.person.getId();
        if (personId != 0) {
            // int deletedElements = dashboardKpiViewMapper.removeElements(personId, "personal");
            try{
                dashboardModel.createPersonalTemplate(items, templateName, type, personId);
            }
            catch (Exception ex){
                return HttpStatus.INTERNAL_SERVER_ERROR;
            }
            return HttpStatus.OK;
        }

        return HttpStatus.UNAUTHORIZED;
    }

    //------------------------------------------

    @RequestMapping(value = "dashboardtemplatelist", method = RequestMethod.GET)
    public List<TemplateType> getDashboardTemplates() {

        return new ArrayList<TemplateType>(EnumSet.allOf(TemplateType.class));
    }


    @RequestMapping(value = "dashboardPersonalTemplates", method = RequestMethod.GET)
    public List<DashboardKpiViewEx> getDashboardPersonalTemplates(@AuthenticationPrincipal SecurityConfiguration.PersonUserDetails principal) {

       return dashboardModel.getPersonalTemplates(principal.person.getId());
    }


    @RequestMapping(path = "setactivepersonaltemplate", method = RequestMethod.POST)
    public HttpStatus activePersonalTemplate(@RequestBody DashboardKpiViewEx item, @AuthenticationPrincipal SecurityConfiguration.PersonUserDetails principal) {

        Optional<Long> personId = Optional.of(principal.person.getId());
        if (personId.isPresent()) {

            dashboardModel.setActivePersonalTemplate(item, personId.get());
            return HttpStatus.OK;
        }
        return HttpStatus.UNAUTHORIZED;
    }


    @RequestMapping(path = "deletepersonaltemplate", method = RequestMethod.POST)
    public HttpStatus deletePersonalTemplate(@RequestBody DashboardKpiViewEx item, @AuthenticationPrincipal SecurityConfiguration.PersonUserDetails principal) {
        Optional<Long> personId = Optional.of(principal.person.getId());
        if (personId.isPresent()) {
            try {
                dashboardKpiViewMapper.removeElements(personId.get(), item.getId());
            } catch (Exception e) {
                return HttpStatus.INTERNAL_SERVER_ERROR;
            }

            return HttpStatus.OK;

        }

        return HttpStatus.UNAUTHORIZED;
    }

    @RequestMapping(path = "makeinactivepersonaltemplate", method = RequestMethod.DELETE)
    public HttpStatus deletePersonToTemplateData(@AuthenticationPrincipal SecurityConfiguration.PersonUserDetails principal) {

        Optional<Long> personId = Optional.of(principal.person.getId());
        if (personId.isPresent()) {
            dashboardKpiViewMapper.deletePerson2TemplateDataByPersonId(personId.get());
            return HttpStatus.OK;
        }
        return HttpStatus.UNAUTHORIZED;
    }


    @RequestMapping(value = "editpersonaltemplate/{dashboardTemplateId}", method = RequestMethod.POST)
    public HttpStatus editPersonalTemplateData(@RequestBody List<Integer> excludedKpiIdList,
                                               @PathVariable("dashboardTemplateId") Integer dashboardTemplateId,
                                                @AuthenticationPrincipal SecurityConfiguration.PersonUserDetails principal) {

        Optional<Long> personId = Optional.of(principal.person.getId());
        if (personId.isPresent()) {
            dashboardModel.editPersonalTemplate(excludedKpiIdList, dashboardTemplateId);
            return HttpStatus.OK;
        }
        return HttpStatus.UNAUTHORIZED;
    }

}
